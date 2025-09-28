#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
해기사 세미나 자동화 시스템 - 스케줄러
Author: Manus AI
Date: 2025-09-26
"""

import schedule
import time
import logging
import sys
import os
from datetime import datetime
import pytz
from seminar_automation_system import SeminarAutomationSystem

# 로그 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/seminar_scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 일본 표준시 타임존 설정
JST = pytz.timezone('Asia/Tokyo')

class SeminarScheduler:
    def __init__(self):
        self.system = SeminarAutomationSystem()
        self.retry_count = 0
        self.max_retries = 1
        self.last_execution_status = None
        
    def run_main_process(self, dry_run: bool = True):
        """메인 프로세스 실행"""
        try:
            current_time = datetime.now(JST)
            logger.info(f"海技士セミナー自動化システム実行開始: {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            # 메인 프로세스 실행
            self.system.main_process(dry_run=dry_run)
            
            self.last_execution_status = 'success'
            self.retry_count = 0
            
            logger.info("海技士セミナー自動化システム実行完了")
            
        except Exception as e:
            self.last_execution_status = 'failed'
            logger.error(f"海技士セミナー自動化システム実行失敗: {str(e)}")
            
            # 재시도 로직
            if self.retry_count < self.max_retries:
                self.retry_count += 1
                logger.info(f"30分後に再実行予定 ({self.retry_count}/{self.max_retries})")
                
                # 30분 후 재시도 스케줄 등록
                schedule.every(30).minutes.do(self.retry_main_process, dry_run=dry_run).tag('retry')
            else:
                logger.critical("최대 재시도 횟수 초과. 운영 담당자에게 알림이 필요합니다.")
                self.notify_ops_failure(str(e))
    
    def retry_main_process(self, dry_run: bool = True):
        """재시도 프로세스 실행"""
        logger.info(f"海技士セミナー自動化システム再実行 ({self.retry_count}/{self.max_retries})")
        
        try:
            self.system.main_process(dry_run=dry_run)
            
            self.last_execution_status = 'success_retry'
            logger.info("海技士セミナー自動化システム再実行成功")
            
            # 재시도 스케줄 제거
            schedule.clear('retry')
            
        except Exception as e:
            logger.error(f"海技士セミナー自動化システム再実行失敗: {str(e)}")
            
            if self.retry_count >= self.max_retries:
                logger.critical("재시도 실패. 운영 담당자에게 알림이 필요합니다.")
                self.notify_ops_failure(str(e))
                
                # 재시도 스케줄 제거
                schedule.clear('retry')
    
    def notify_ops_failure(self, error_message: str):
        """운영 담당자에게 장애 알림"""
        failure_time = datetime.now(JST).strftime('%Y-%m-%d %H:%M:%S')
        
        # 실제 구현에서는 이메일이나 Slack으로 알림 발송
        logger.critical(f"""
=== 해기사 세미나 자동화 시스템 장애 알림 ===
발생 시각: {failure_time}
오류 내용: {error_message}
재시도 횟수: {self.retry_count}/{self.max_retries}

시스템의 수동 확인과 복구 작업이 필요합니다.
로그 파일: /home/ubuntu/seminar_scheduler.log
        """)
    
    def health_check(self):
        """시스템 상태 확인"""
        current_time = datetime.now(JST)
        logger.info(f"海技士セミナー自動化システム状態確認: {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 데이터베이스 연결 확인
        try:
            import sqlite3
            conn = sqlite3.connect('/home/ubuntu/seminar_automation.db')
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM seminars')
            seminar_count = cursor.fetchone()[0]
            conn.close()
            
            logger.info(f"データベース接続正常。保存されたセミナー数: {seminar_count}")
            
        except Exception as e:
            logger.error(f"データベース接続エラー: {str(e)}")
    
    def setup_schedule(self, dry_run: bool = True):
        """스케줄 설정"""
        # 매일 오전 9시에 실행
        schedule.every().day.at("09:00").do(self.run_main_process, dry_run=dry_run).tag('main')
        
        # 매시간 상태 확인 (선택사항)
        schedule.every().hour.do(self.health_check).tag('health')
        
        logger.info("スケジュール設定完了:")
        logger.info("  - 毎日09:00 JST: メインプロセス実行")
        logger.info("  - 毎時: 状態確認")
        logger.info(f"  - Dry-runモード: {'有効' if dry_run else '無効'}")
    
    def run_scheduler(self, dry_run: bool = True):
        """스케줄러 실행"""
        self.setup_schedule(dry_run=dry_run)
        
        logger.info("海技士セミナー自動化システムスケジューラー開始")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # 1분마다 스케줄 확인
                
        except KeyboardInterrupt:
            logger.info("スケジューラーがユーザーによって停止されました")
        except Exception as e:
            logger.error(f"スケジューラー実行中エラー: {str(e)}")
    
    def run_once(self, dry_run: bool = True):
        """즉시 1회 실행 (테스트용)"""
        logger.info("海技士セミナー自動化システム即座実行")
        self.run_main_process(dry_run=dry_run)

def main():
    """메인 함수"""
    scheduler = SeminarScheduler()
    
    # 명령행 인수 처리
    if len(sys.argv) > 1:
        if sys.argv[1] == '--test':
            # 테스트 모드: 즉시 1회 실행 (Dry-run)
            scheduler.run_once(dry_run=True)
        elif sys.argv[1] == '--production':
            # 프로덕션 모드: 즉시 1회 실행 (실제 발송)
            scheduler.run_once(dry_run=False)
        elif sys.argv[1] == '--schedule':
            # 스케줄러 모드: 지속적 실행 (Dry-run)
            scheduler.run_scheduler(dry_run=True)
        elif sys.argv[1] == '--schedule-production':
            # 스케줄러 프로덕션 모드: 지속적 실행 (실제 발송)
            scheduler.run_scheduler(dry_run=False)
        elif sys.argv[1] == '--health':
            # 상태 확인
            scheduler.health_check()
        else:
            print("사용법:")
            print("  python seminar_scheduler.py --test              # 즉시 1회 실행 (Dry-run)")
            print("  python seminar_scheduler.py --production        # 즉시 1회 실행 (실제 발송)")
            print("  python seminar_scheduler.py --schedule          # 스케줄러 실행 (Dry-run)")
            print("  python seminar_scheduler.py --schedule-production # 스케줄러 실행 (실제 발송)")
            print("  python seminar_scheduler.py --health            # 상태 확인")
    else:
        # 환경변수에서 DRY_RUN 설정 읽기 (기본값: True)
        dry_run_env = os.getenv('DRY_RUN', 'true').lower() in ('true', '1', 'yes')
        scheduler.run_scheduler(dry_run=dry_run_env)

if __name__ == "__main__":
    main()
