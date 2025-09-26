#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
海技士セミナー情報自動化システム - コア実装
Author: Manus AI
Date: 2025-09-26
"""

import sqlite3
import requests
import feedparser
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import hashlib
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re
import time
import os
import json
from typing import List, Dict, Optional, Tuple
import pytz

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/seminar_automation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 日本標準時タイムゾーン設定
JST = pytz.timezone('Asia/Tokyo')

class SeminarAutomationSystem:
    def __init__(self, db_path: str = '/app/data/seminar_automation.db'):
        self.db_path = db_path
        self.setup_database()
        
        # セミナー関連キーワード定義
        self.seminar_keywords = [
            '海技士セミナー', '海事セミナー', 'めざせ！海技者', '船員就職',
            '海技者', '船員セミナー', '海運セミナー', '海事講習',
            '船員養成', '海技免許', '海技資格'
        ]
        
        # ステータスキーワード定義
        self.status_keywords = {
            '募集開始': '募集中',
            '募集中': '募集中',
            '受付開始': '募集中',
            '申込開始': '募集中',
            '満員': '募集締切',
            '定員満了': '募集締切',
            '締切': '募集締切',
            '受付終了': '募集締切',
            '申込終了': '募集締切',
            '開催予定': '開催予定',
            '開催中': '開催予定',
            '終了': '開催終了',
            '開催終了': '開催終了',
            '中止': '中止',
            '延期': 'その他'
        }
        
        # 地方運輸局情報読み込み
        self.load_transport_bureaus()

    def setup_database(self):
        """データベース初期化"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # テーブル作成
        cursor.executescript('''
            CREATE TABLE IF NOT EXISTS regions (
                region_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(50) UNIQUE NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS sources (
                source_id INTEGER PRIMARY KEY AUTOINCREMENT,
                region_id INTEGER REFERENCES regions(region_id),
                url VARCHAR(255) NOT NULL,
                type VARCHAR(10) NOT NULL CHECK (type IN ('rss', 'html', 'api', 'seminar')),
                active BOOLEAN DEFAULT true
            );
            
            CREATE TABLE IF NOT EXISTS seminars (
                seminar_id INTEGER PRIMARY KEY AUTOINCREMENT,
                region_id INTEGER REFERENCES regions(region_id),
                title VARCHAR(255) NOT NULL,
                event_date TIMESTAMP,
                location VARCHAR(255),
                status VARCHAR(50) CHECK (status IN (
                    '募集中', '募集予定', '募集締切', '募集期限切れ',
                    '開催予定', '開催終了', '中止', 'その他'
                )) DEFAULT '募集中',
                source_url VARCHAR(255) UNIQUE NOT NULL,
                raw_text TEXT,
                hash VARCHAR(64) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS subscribers (
                subscriber_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                region_id INTEGER REFERENCES regions(region_id)
            );
            
            CREATE TABLE IF NOT EXISTS subscriber_routing (
                routing_id INTEGER PRIMARY KEY AUTOINCREMENT,
                subscriber_id INTEGER REFERENCES subscribers(subscriber_id),
                channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'slack')),
                address VARCHAR(255) NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS seminar_notifications (
                notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
                seminar_id INTEGER REFERENCES seminars(seminar_id),
                channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'slack')),
                address VARCHAR(255) NOT NULL,
                status VARCHAR(10) NOT NULL CHECK (status IN ('ok', 'fail')),
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                error TEXT
            );
        ''')
        
        # 초기 데이터 투입
        regions_data = [
            ('북해도',), ('동북',), ('관동',), ('북륙신월',), ('중부',),
            ('근기',), ('고베',), ('중국',), ('사국',), ('구주',)
        ]
        cursor.executemany('INSERT OR IGNORE INTO regions (name) VALUES (?)', regions_data)
        
        conn.commit()
        conn.close()
        logger.info("データベース初期化が完了しました")

    def load_transport_bureaus(self):
        """지방운수국 정보 로드"""
        try:
            with open('/app/regional_transport_bureaus.json', 'r', encoding='utf-8') as f:
                bureaus_data = json.load(f)
            
            self.transport_bureaus = {}
            region_mapping = {
                '北海道運輸局': '북해도',
                '東北運輸局': '동북',
                '関東運輸局': '관동',
                '北陸信越運輸局': '북륙신월',
                '中部運輸局': '중부',
                '近畿運輸局': '근기',
                '神戸運輸監理部': '고베',
                '中国運輸局': '중국',
                '四国運輸局': '사국',
                '九州運輸局': '구주'
            }
            
            for bureau in bureaus_data:
                if bureau['name'] in region_mapping:
                    region_name = region_mapping[bureau['name']]
                    self.transport_bureaus[region_name] = {
                        'name': bureau['name'],
                        'url': bureau['url'],
                        'type': 'html'  # 기본값, RSS 확인 후 변경 가능
                    }
            
            logger.info(f"地方運輸局情報読込完了: {len(self.transport_bureaus)}機関")
            
        except FileNotFoundError:
            logger.error("地方運輸局情報ファイルが見つかりません")
            self.transport_bureaus = {}

    def collect_seminars_from_all_sources(self) -> List[Dict]:
        """모든 정보원에서 세미나 정보 수집"""
        all_seminars = []
        
        for region_name, bureau_info in self.transport_bureaus.items():
            try:
                logger.info(f"{region_name}地域のセミナー情報収集開始: {bureau_info['url']}")
                
                if bureau_info['type'] == 'rss':
                    seminars = self.collect_from_rss(bureau_info, region_name)
                else:
                    seminars = self.collect_from_html(bureau_info, region_name)
                
                all_seminars.extend(seminars)
                logger.info(f"{region_name}地域から{len(seminars)}件のセミナー情報を収集")
                
            except Exception as e:
                logger.error(f"{region_name}地域情報収集中にエラー: {str(e)}")
                continue

        # 過去イベントを除外し、未来イベントのみ返す
        future_seminars = self.filter_future_seminars(all_seminars)
        logger.info(f"全収集件数: {len(all_seminars)}件, 未来イベント: {len(future_seminars)}件")

        return future_seminars

    def collect_from_rss(self, bureau_info: Dict, region_name: str) -> List[Dict]:
        """RSS 피드에서 세미나 정보 수집"""
        seminars = []
        
        try:
            feed = feedparser.parse(bureau_info['url'])
            
            for entry in feed.entries:
                title = entry.title
                
                # 세미나 키워드 필터링
                if not self.contains_seminar_keywords(title):
                    continue
                
                seminar = {
                    'region': region_name,
                    'title': title,
                    'event_date': self.parse_date(entry.published if hasattr(entry, 'published') else entry.updated),
                    'location': self.extract_location(title),
                    'status': self.detect_status(title),
                    'source_url': entry.link,
                    'raw_text': entry.summary if hasattr(entry, 'summary') else title
                }
                seminars.append(seminar)
                
        except Exception as e:
            logger.error(f"RSS 수집 오류 ({bureau_info['url']}): {str(e)}")
            
        return seminars

    def collect_from_html(self, bureau_info: Dict, region_name: str) -> List[Dict]:
        """HTML 페이지에서 세미나 정보 수집"""
        seminars = []
        
        try:
            response = requests.get(bureau_info['url'], timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 세미나 관련 링크 찾기
            links = soup.find_all('a', href=True)
            
            for link in links:
                title = link.get_text(strip=True)
                
                # 세미나 키워드 필터링
                if not self.contains_seminar_keywords(title):
                    continue
                
                href = link.get('href')
                if href:
                    # 상대 URL을 절대 URL로 변환
                    if href.startswith('/'):
                        source_url = bureau_info['url'].rstrip('/') + href
                    elif href.startswith('http'):
                        source_url = href
                    else:
                        source_url = bureau_info['url'].rstrip('/') + '/' + href
                    
                    seminar = {
                        'region': region_name,
                        'title': title,
                        'event_date': self.extract_date_from_text(title),
                        'location': self.extract_location(title),
                        'status': self.detect_status(title),
                        'source_url': source_url,
                        'raw_text': title
                    }
                    seminars.append(seminar)
                    
        except Exception as e:
            logger.error(f"HTML 수집 오류 ({bureau_info['url']}): {str(e)}")
            
        return seminars

    def contains_seminar_keywords(self, text: str) -> bool:
        """텍스트에 세미나 키워드가 포함되어 있는지 확인"""
        text_lower = text.lower()
        for keyword in self.seminar_keywords:
            if keyword.lower() in text_lower:
                return True
        return False

    def detect_status(self, text: str) -> str:
        """텍스트에서 세미나 상태 감지"""
        for keyword, status in self.status_keywords.items():
            if keyword in text:
                return status
        return '募集中'  # デフォルト値

    def extract_location(self, text: str) -> Optional[str]:
        """텍스트에서 장소 정보 추출"""
        # 간단한 장소 추출 로직 (개선 가능)
        location_patterns = [
            r'(東京|大阪|神戸|福岡|仙台|札幌|名古屋|広島|高松|那覇)',
            r'(会議室|ホール|センター|ビル|会館)',
            r'IN\s+([A-Z]+)',
            r'in\s+([^\s]+)'
        ]
        
        for pattern in location_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1) if match.group(1) else match.group(0)
        
        return None

    def extract_date_from_text(self, text: str) -> Optional[datetime]:
        """텍스트에서 날짜 정보 추출"""
        # 일본 날짜 형식 패턴
        date_patterns = [
            r'令和(\d+)年(\d+)月(\d+)日',
            r'(\d{4})年(\d{1,2})月(\d{1,2})日',
            r'(\d{1,2})月(\d{1,2})日',
            r'(\d{4})/(\d{1,2})/(\d{1,2})',
            r'(\d{4})-(\d{1,2})-(\d{1,2})'
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    if '令和' in pattern:
                        # 령화 연호를 서기로 변환 (령화 1년 = 2019년)
                        reiwa_year = int(match.group(1))
                        year = 2018 + reiwa_year
                        month = int(match.group(2))
                        day = int(match.group(3))
                    elif len(match.groups()) == 3:
                        year = int(match.group(1))
                        month = int(match.group(2))
                        day = int(match.group(3))
                        if year < 100:  # 2자리 연도 처리
                            year += 2000
                    elif len(match.groups()) == 2:
                        # 월/일만 있는 경우 현재 연도 사용
                        year = datetime.now().year
                        month = int(match.group(1))
                        day = int(match.group(2))
                    else:
                        continue
                    
                    return JST.localize(datetime(year, month, day))
                except ValueError:
                    continue
        
        return None

    def is_future_event(self, event_date: Optional[datetime]) -> bool:
        """이벤트가 미래 이벤트인지 확인 (오늘 포함)"""
        if not event_date:
            return True  # 날짜 불명인 경우 포함

        current_time = datetime.now(JST)
        today = current_time.replace(hour=0, minute=0, second=0, microsecond=0)

        # 오늘 이후의 이벤트만 포함
        return event_date >= today

    def filter_future_seminars(self, seminars: List[Dict]) -> List[Dict]:
        """미래 세미나만 필터링"""
        future_seminars = []

        for seminar in seminars:
            event_date = seminar.get('event_date')

            # 텍스트 형태의 날짜를 datetime으로 변환
            if isinstance(event_date, str):
                parsed_date = self.extract_date_from_text(event_date)
                seminar['parsed_event_date'] = parsed_date
            else:
                parsed_date = event_date

            # 미래 이벤트만 포함
            if self.is_future_event(parsed_date):
                future_seminars.append(seminar)
                logger.info(f"未来イベント含む: {seminar.get('title', 'N/A')} - {event_date}")
            else:
                logger.info(f"過去イベント除外: {seminar.get('title', 'N/A')} - {event_date}")

        return future_seminars

    def get_recent_seminars(self, limit: int = 1) -> List[Dict]:
        """最近のセミナー情報を取得"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # 最近作成されたセミナー情報を取得
            cursor.execute('''
                SELECT title, event_date, location, status, source_url, created_at
                FROM seminars
                ORDER BY created_at DESC
                LIMIT ?
            ''', (limit,))

            rows = cursor.fetchall()
            conn.close()

            recent_seminars = []
            for row in rows:
                recent_seminars.append({
                    'title': row[0],
                    'event_date': row[1],
                    'location': row[2],
                    'status': row[3],
                    'source_url': row[4],
                    'created_at': row[5]
                })

            return recent_seminars

        except Exception as e:
            logger.error(f"最近のセミナー情報取得エラー: {str(e)}")
            return []

    def get_all_subscribers(self) -> List[str]:
        """全ての購読者メールアドレスを取得"""
        try:
            # 環境変数から取得
            test_email = os.getenv('TEST_EMAIL')
            if test_email:
                return [test_email]
            else:
                logger.warning("TEST_EMAIL環境変数が設定されていません")
                return []
        except Exception as e:
            logger.error(f"購読者リスト取得エラー: {str(e)}")
            return []

    def create_no_new_info_summary(self, recent_seminars: List[Dict]) -> str:
        """新しい情報がない場合のメール内容を作成"""
        try:
            current_date = datetime.now(JST).strftime('%Y年%m月%d日')

            html_content = f"""
            <html>
            <head>
                <meta charset="UTF-8">
                <title>海技士セミナー情報 - {current_date}</title>
                <style>
                    body {{ font-family: 'Segoe UI', 'Yu Gothic', 'Hiragino Kaku Gothic Pro', Meiryo, sans-serif; margin: 0; padding: 20px; background-color: #f5f7fa; }}
                    .container {{ max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .header h1 {{ margin: 0; font-size: 28px; font-weight: 300; }}
                    .header p {{ margin: 10px 0 0; opacity: 0.9; }}
                    .content {{ padding: 30px; }}
                    .status-message {{ background-color: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 30px; border-radius: 0 5px 5px 0; }}
                    .recent-section {{ margin-top: 30px; }}
                    .recent-section h2 {{ color: #4a5568; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }}
                    .seminar-item {{ background-color: #fafbfc; border: 1px solid #e1e8ed; border-radius: 8px; padding: 20px; margin: 15px 0; }}
                    .seminar-title {{ font-size: 18px; font-weight: 600; color: #2d3748; margin-bottom: 10px; }}
                    .seminar-details {{ display: grid; grid-template-columns: auto 1fr; gap: 10px; }}
                    .detail-label {{ font-weight: 600; color: #4a5568; }}
                    .detail-value {{ color: #2d3748; }}
                    .footer {{ background-color: #f7fafc; padding: 20px; text-align: center; color: #718096; border-radius: 0 0 10px 10px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚢 海技士セミナー情報</h1>
                        <p>{current_date} 配信</p>
                    </div>
                    <div class="content">
                        <div class="status-message">
                            <h2 style="color: #667eea; margin-top: 0;">📋 本日の配信状況</h2>
                            <p><strong>本日は新しいセミナー情報の更新がありませんでした。</strong></p>
                            <p>各地方運輸局のサイトを確認しましたが、新規または更新されたセミナー情報は見つかりませんでした。</p>
                        </div>"""

            if recent_seminars:
                html_content += """
                        <div class="recent-section">
                            <h2>📅 最近のセミナー情報</h2>
                            <p>参考として、最近収集されたセミナー情報をお知らせします：</p>"""

                for seminar in recent_seminars:
                    html_content += f"""
                            <div class="seminar-item">
                                <div class="seminar-title">{seminar.get('title', 'タイトル未設定')}</div>
                                <div class="seminar-details">
                                    <span class="detail-label">📅 開催日:</span>
                                    <span class="detail-value">{seminar.get('event_date', '未定')}</span>
                                    <span class="detail-label">📍 場所:</span>
                                    <span class="detail-value">{seminar.get('location', '未定')}</span>
                                    <span class="detail-label">📋 状況:</span>
                                    <span class="detail-value">{seminar.get('status', '未定')}</span>
                                    <span class="detail-label">🔗 詳細:</span>
                                    <span class="detail-value"><a href="{seminar.get('source_url', '#')}" target="_blank">詳細を見る</a></span>
                                </div>
                            </div>"""

                html_content += """
                        </div>"""

            html_content += f"""
                    </div>
                    <div class="footer">
                        <p>このメールは海技士セミナー情報自動配信システムより送信されました。</p>
                        <p>次回配信: 明日 09:00 JST</p>
                        <p>配信時刻: {datetime.now(JST).strftime('%Y年%m月%d日 %H:%M:%S JST')}</p>
                    </div>
                </div>
            </body>
            </html>"""

            return html_content

        except Exception as e:
            logger.error(f"情報なしメール作成エラー: {str(e)}")
            return f"<html><body><h2>海技士セミナー情報 - {current_date}</h2><p>本日は新しい情報がありませんでした。</p></body></html>"

    def send_html_email(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """HTML 이메일 발송"""
        try:
            # SMTP 설정을 환경변수에서 읽기
            smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
            smtp_port = int(os.getenv('SMTP_PORT', '587'))
            smtp_username = os.getenv('SMTP_USERNAME')
            smtp_password = os.getenv('SMTP_PASSWORD')
            from_email = os.getenv('FROM_EMAIL', smtp_username)

            if not smtp_username or not smtp_password:
                logger.error("SMTP 인증 정보가 설정되지 않았습니다")
                return False

            # 이메일 메시지 생성
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = from_email
            msg['To'] = to_email

            # HTML과 텍스트 버전 추가
            if text_content:
                text_part = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(text_part)

            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)

            # SMTP 서버 연결 및 발송
            logger.info(f"SMTP 설정: {smtp_server}:{smtp_port}")
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)

            logger.info(f"✅ 메일 발송 성공: {subject}")
            return True

        except Exception as e:
            logger.error(f"메일 발송 실패: {str(e)}")
            return False

    def parse_date(self, date_str: str) -> datetime:
        """날짜 문자열을 datetime 객체로 변환"""
        try:
            # 복수의 날짜 형식에 대응
            formats = [
                '%a, %d %b %Y %H:%M:%S %z',
                '%Y-%m-%d %H:%M:%S',
                '%Y/%m/%d %H:%M:%S',
                '%Y-%m-%d',
                '%Y/%m/%d'
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    if dt.tzinfo is None:
                        dt = JST.localize(dt)
                    return dt
                except ValueError:
                    continue
                    
        except Exception:
            pass
            
        # 파싱에 실패한 경우 현재 시각 반환
        return datetime.now(JST)

    def normalize_seminar(self, seminar_data: Dict) -> Dict:
        """세미나 데이터 정규화"""
        # 해시값 생성
        hash_input = f"{seminar_data['title']}{seminar_data.get('event_date', '')}{seminar_data['status']}"
        seminar_hash = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()
        
        return {
            'region': seminar_data['region'],
            'title': seminar_data['title'][:255],  # 길이 제한
            'event_date': seminar_data.get('event_date'),
            'location': seminar_data.get('location', '')[:255] if seminar_data.get('location') else None,
            'status': seminar_data['status'],
            'source_url': seminar_data['source_url'],
            'raw_text': seminar_data['raw_text'],
            'hash': seminar_hash
        }

    def is_duplicated(self, seminar_hash: str) -> bool:
        """중복 확인 (과거 24시간 이내)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff_time = datetime.now(JST) - timedelta(hours=24)
        
        cursor.execute('''
            SELECT COUNT(*) FROM seminars 
            WHERE hash = ? AND created_at > ?
        ''', (seminar_hash, cutoff_time))
        
        count = cursor.fetchone()[0]
        conn.close()
        
        return count > 0

    def is_important(self, seminar: Dict) -> bool:
        """중요 정보 판정"""
        # 상태 기반 중요도 판정
        important_statuses = ['모집 중', '모집 마감', '개최 예정']
        
        if seminar['status'] in important_statuses:
            return True
        
        # 키워드 기반 중요도 판정
        important_keywords = ['募集開始', '満員', '締切', '開催予定']
        text_to_check = f"{seminar['title']} {seminar['raw_text']}".lower()
        
        for keyword in important_keywords:
            if keyword.lower() in text_to_check:
                return True
                
        return False

    def save_seminar(self, seminar: Dict) -> int:
        """세미나 정보를 데이터베이스에 저장"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 지역 ID 취득
        cursor.execute('SELECT region_id FROM regions WHERE name = ?', (seminar['region'],))
        region_result = cursor.fetchone()
        
        if not region_result:
            logger.error(f"지역을 찾을 수 없습니다: {seminar['region']}")
            conn.close()
            return None
            
        region_id = region_result[0]
        
        try:
            cursor.execute('''
                INSERT INTO seminars (region_id, title, event_date, location, status, source_url, raw_text, hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (region_id, seminar['title'], seminar['event_date'], 
                  seminar['location'], seminar['status'], seminar['source_url'], 
                  seminar['raw_text'], seminar['hash']))
            
            seminar_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return seminar_id
            
        except sqlite3.IntegrityError:
            # 중복 오류는 무시
            conn.close()
            return None

    def summarize_seminars(self, seminars: List[Dict]) -> str:
        """세미나 정보 요약 생성"""
        if not seminars:
            return "오늘은 중요한 해기사 세미나 정보가 없습니다."
        
        summary_parts = []
        
        for i, seminar in enumerate(seminars[:10], 1):  # 최대 10건
            event_date_str = ""
            if seminar.get('event_date'):
                if isinstance(seminar['event_date'], str):
                    event_date_str = f" [{seminar['event_date'][:10]}]"
                else:
                    event_date_str = f" [{seminar['event_date'].strftime('%Y-%m-%d')}]"
            
            location_str = f" @{seminar['location']}" if seminar.get('location') else ""
            status_str = f" ({seminar['status']})" if seminar['status'] != '모집 중' else ""
            
            summary_parts.append(f"{i}. {seminar['title'][:80]}{event_date_str}{location_str}{status_str}")
        
        summary = f"중요한 해기사 세미나 정보 {len(seminars)}건:\n\n" + "\n".join(summary_parts)
        
        if len(summary) > 500:
            summary = summary[:450] + "...\n\n자세한 내용은 각 세미나 정보를 확인해주세요."
        
        return summary

    def get_subscribers_by_region(self, region: str) -> List[Dict]:
        """지역별 구독자 목록 취득"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT s.subscriber_id, s.name, r.name as region_name
            FROM subscribers s
            JOIN regions r ON s.region_id = r.region_id
            WHERE r.name = ?
        ''', (region,))
        
        subscribers = []
        for row in cursor.fetchall():
            subscribers.append({
                'subscriber_id': row[0],
                'name': row[1],
                'region': row[2]
            })
        
        conn.close()
        return subscribers

    def get_routing_info(self, subscriber_id: int) -> List[Dict]:
        """구독자의 라우팅 정보 취득"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT routing_id, channel, address
            FROM subscriber_routing
            WHERE subscriber_id = ?
        ''', (subscriber_id,))
        
        routes = []
        for row in cursor.fetchall():
            routes.append({
                'routing_id': row[0],
                'channel': row[1],
                'address': row[2]
            })
        
        conn.close()
        return routes

    def send_notification(self, route: Dict, summary: str, seminars: List[Dict], dry_run: bool = True) -> Tuple[str, str]:
        """통지 발송 (Dry-run 모드 지원)"""
        if route['channel'] == 'email':
            return self.send_email_notification(route, summary, seminars, dry_run)
        elif route['channel'] == 'slack':
            return self.send_slack_notification(route, summary, seminars, dry_run)
        else:
            return 'fail', f"지원하지 않는 채널: {route['channel']}"

    def send_email_notification(self, route: Dict, summary: str, seminars: List[Dict], dry_run: bool = True) -> Tuple[str, str]:
        """이메일 통지 발송"""
        try:
            subject = f"【海技士セミナー情報】{datetime.now(JST).strftime('%Y-%m-%d')} 重要情報 (新着 {len(seminars)}件)"
            
            body = f"""
해기사 세미나 정보 자동화 시스템에서 알려드립니다.

{summary}

상세 정보:
"""
            
            for seminar in seminars:
                event_date_str = ""
                if seminar.get('event_date'):
                    if isinstance(seminar['event_date'], str):
                        event_date_str = f"\n  개최일: {seminar['event_date'][:10]}"
                    else:
                        event_date_str = f"\n  개최일: {seminar['event_date'].strftime('%Y-%m-%d')}"
                
                location_str = f"\n  장소: {seminar['location']}" if seminar.get('location') else ""
                
                body += f"\n・{seminar['title']}\n  상태: {seminar['status']}{event_date_str}{location_str}\n  URL: {seminar['source_url']}\n"
            
            body += f"\n\n발송 시각: {datetime.now(JST).strftime('%Y-%m-%d %H:%M:%S')}"
            
            if dry_run:
                logger.info(f"이메일 발송 (Dry-run): {route['address']} - {subject}")
                logger.debug(f"이메일 내용 (Dry-run):\n{body}")
            else:
                # 실제 이메일 발송 로직
                logger.info(f"이메일 발송: {route['address']} - {subject}")

                # HTML 메일 내용이면 그대로 사용, 아니면 텍스트로 처리
                if summary.strip().startswith('<html>'):
                    # HTML 메일 발송
                    success = self.send_html_email(
                        to_email=route['address'],
                        subject=subject,
                        html_content=summary,
                        text_content=body
                    )
                else:
                    # 텍스트 메일 발송
                    success = self.send_html_email(
                        to_email=route['address'],
                        subject=subject,
                        html_content=body.replace('\n', '<br>'),
                        text_content=body
                    )

                if not success:
                    return 'fail', 'SMTP 메일 발송 실패'

            return 'ok', None
            
        except Exception as e:
            return 'fail', str(e)

    def send_slack_notification(self, route: Dict, summary: str, seminars: List[Dict], dry_run: bool = True) -> Tuple[str, str]:
        """Slack 통지 발송"""
        try:
            message = f"*해기사 세미나 정보 알림*\n\n{summary}\n\n발송 시각: {datetime.now(JST).strftime('%Y-%m-%d %H:%M:%S')}"
            
            if dry_run:
                logger.info(f"Slack 발송 (Dry-run): {route['address']} - 해기사 세미나 정보 {len(seminars)}건")
                logger.debug(f"Slack 메시지 (Dry-run):\n{message}")
            else:
                # 실제 Slack API 호출 로직 (Webhook URL 또는 Bot Token 필요)
                logger.info(f"Slack 발송: {route['address']} - 해기사 세미나 정보 {len(seminars)}건")
            
            return 'ok', None
            
        except Exception as e:
            return 'fail', str(e)

    def log_notification(self, seminar_id: int, channel: str, address: str, status: str, error: str = None):
        """통지 로그 기록"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO seminar_notifications (seminar_id, channel, address, status, error)
            VALUES (?, ?, ?, ?, ?)
        ''', (seminar_id, channel, address, status, error))
        
        conn.commit()
        conn.close()

    def get_new_important_seminars_by_region(self, region: str) -> List[Dict]:
        """지역별 신착 중요 세미나 취득"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff_time = datetime.now(JST) - timedelta(hours=24)
        
        cursor.execute('''
            SELECT s.seminar_id, s.title, s.event_date, s.location, s.status, s.source_url, s.raw_text
            FROM seminars s
            JOIN regions r ON s.region_id = r.region_id
            WHERE r.name = ? AND s.created_at > ?
            ORDER BY s.created_at DESC
        ''', (region, cutoff_time))
        
        seminars = []
        for row in cursor.fetchall():
            seminar = {
                'seminar_id': row[0],
                'title': row[1],
                'event_date': row[2],
                'location': row[3],
                'status': row[4],
                'source_url': row[5],
                'raw_text': row[6]
            }
            
            # 중요성 확인
            if self.is_important(seminar):
                seminars.append(seminar)
        
        conn.close()
        return seminars

    def check_failures_and_notify_ops(self):
        """발송 실패 확인 및 운영 담당자 통지"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 과거 1시간의 발송 실패 확인
        cutoff_time = datetime.now(JST) - timedelta(hours=1)
        
        cursor.execute('''
            SELECT COUNT(*) FROM seminar_notifications 
            WHERE status = 'fail' AND sent_at > ?
        ''', (cutoff_time,))
        
        failure_count = cursor.fetchone()[0]
        
        if failure_count > 0:
            logger.warning(f"세미나 정보 발송 실패가 {failure_count}건 발생했습니다")
            # 실제 구현에서는 운영 담당자에게 통지 발송
        
        conn.close()

    def main_process(self, dry_run: bool = True):
        """메인 처리"""
        logger.info("海技士セミナー情報自動化システム開始")
        
        # 통계 변수
        total_collected = 0
        total_new_important = 0
        total_notifications_sent = 0
        total_notifications_failed = 0
        
        # 1. 수집
        raw_seminars = self.collect_seminars_from_all_sources()
        total_collected = len(raw_seminars)
        logger.info(f"総収集件数: {total_collected}")
        
        processed_seminars = []
        
        for seminar_data in raw_seminars:
            # 2. 정규화
            normalized_seminar = self.normalize_seminar(seminar_data)
            
            # 3. 중복 제거
            if self.is_duplicated(normalized_seminar['hash']):
                continue
            
            # 4. 중요 정보 추출
            if not self.is_important(normalized_seminar):
                continue
            
            # 데이터베이스에 저장
            seminar_id = self.save_seminar(normalized_seminar)
            if seminar_id:
                normalized_seminar['seminar_id'] = seminar_id
                processed_seminars.append(normalized_seminar)
        
        total_new_important = len(processed_seminars)
        logger.info(f"新着重要セミナー: {total_new_important}")
        
        # 5. 지역별 요약 및 발송 (정보가 없어도 발송)
        all_subscribers = self.get_all_subscribers()

        if all_subscribers:  # 구독자가 있으면 반드시 메일 발송
            # 신착 정보가 있는지 확인
            if total_new_important > 0:
                # 신착 정보가 있는 경우
                for region in self.transport_bureaus.keys():
                    important_seminars = self.get_new_important_seminars_by_region(region)

                    if not important_seminars:
                        continue

                    logger.info(f"{region}地域: {len(important_seminars)}件の重要セミナー")
                    summary = self.summarize_seminars(important_seminars)

                    subscribers_in_region = self.get_subscribers_by_region(region)

                    for subscriber in subscribers_in_region:
                        routes = self.get_routing_info(subscriber['subscriber_id'])

                        for route in routes:
                            status, error = self.send_notification(route, summary, important_seminars, dry_run)

                            if status == 'ok':
                                total_notifications_sent += 1
                            else:
                                total_notifications_failed += 1
                                if error:
                                    logger.error(f"通知送信失敗: {error}")
            else:
                # 신착 정보가 없는 경우 - 상태 보고 메일 발송
                logger.info("新着セミナー情報なし - ステータスレポート送信")
                recent_seminars = self.get_recent_seminars(1)  # 최근 1건 가져오기
                summary = self.create_no_new_info_summary(recent_seminars)

                # 모든 구독자에게 상태 보고 메일 발송
                for subscriber_email in all_subscribers:
                    route = {'channel': 'email', 'address': subscriber_email}
                    status, error = self.send_notification(route, summary, recent_seminars, dry_run)

                    if status == 'ok':
                        total_notifications_sent += 1
                    else:
                        total_notifications_failed += 1
                        if error:
                            logger.error(f"ステータスレポート送信失敗: {error}")

        # 기존 코드 계속 (더미 처리)
        if False:  # 위에서 처리했으므로 실행되지 않음
            subscribers_in_region = []
            
            for subscriber in subscribers_in_region:
                routes = self.get_routing_info(subscriber['subscriber_id'])
                
                for route in routes:
                    status, error = self.send_notification(route, summary, important_seminars, dry_run)
                    
                    if status == 'ok':
                        total_notifications_sent += 1
                    else:
                        total_notifications_failed += 1
                    
                    # 8. 로그 기록
                    for seminar in important_seminars:
                        self.log_notification(seminar['seminar_id'], route['channel'], route['address'], status, error)
        
        # 9. 모니터링 및 알림
        self.check_failures_and_notify_ops()
        
        # 최종 통계 로그
        logger.info(f"해기사 세미나 정보 자동화 시스템 완료 - 순회: {total_collected}, 신착: {total_new_important}, 통지 성공: {total_notifications_sent}, 통지 실패: {total_notifications_failed}")

if __name__ == "__main__":
    system = SeminarAutomationSystem()
    system.main_process(dry_run=True)
