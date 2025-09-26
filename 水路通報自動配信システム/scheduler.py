#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
水路通報の地域別日次自動配信システム - スケジューラー
Author: WaterwaySystem
Date: 2025-09-26
"""

import os
import sys
import time
import logging
import schedule
import subprocess
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import pytz
import signal
import json
from pathlib import Path

# 日本標準時の設定
JST = pytz.timezone('Asia/Tokyo')

class WaterwayScheduler:
    def __init__(self):
        self.setup_logging()
        self.load_environment()
        self.setup_signal_handlers()
        self.is_running = True

    def setup_logging(self):
        """ログ設定"""
        log_dir = Path('./logs')
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig(
            level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('./logs/scheduler.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)
        self.logger.info("水路通報スケジューラーが開始されました")

    def load_environment(self):
        """環境変数の読み込み"""
        self.config = {
            'dry_run': os.getenv('DRY_RUN', 'true').lower() == 'true',
            'timezone': os.getenv('TZ', 'Asia/Tokyo'),
            'daily_time': os.getenv('DAILY_SCHEDULE_TIME', '06:30'),
            'weekly_day': os.getenv('WEEKLY_SCHEDULE_DAY', 'friday'),
            'weekly_time': os.getenv('WEEKLY_SCHEDULE_TIME', '09:30'),
            'default_regions': os.getenv('DEFAULT_REGIONS', 'all'),
            'max_retry': int(os.getenv('MAX_RETRY_COUNT', '3'))
        }

        self.logger.info(f"設定を読み込みました: {json.dumps(self.config, ensure_ascii=False, indent=2)}")

    def setup_signal_handlers(self):
        """シグナルハンドラーの設定"""
        signal.signal(signal.SIGTERM, self.signal_handler)
        signal.signal(signal.SIGINT, self.signal_handler)

    def signal_handler(self, signum, frame):
        """終了シグナルの処理"""
        self.logger.info(f"終了シグナル({signum})を受信しました。スケジューラーを停止します。")
        self.is_running = False

    def run_waterway_system(self, job_type: str, regions: str = 'all', dry_run: Optional[bool] = None) -> bool:
        """水路通報システムの実行"""
        try:
            current_time = datetime.now(JST)
            self.logger.info(f"水路通報システム実行開始: {job_type} - {current_time.strftime('%Y-%m-%d %H:%M:%S JST')}")

            # dry_runパラメータの決定
            if dry_run is None:
                dry_run = self.config['dry_run']

            # 実行コマンドの構築
            cmd = [
                'python', 'waterway_notice_system.py',
                '--region', regions,
                '--job-type', job_type
            ]

            if dry_run:
                cmd.append('--dry-run')

            # 環境変数の設定
            env = os.environ.copy()
            env.update({
                'TZ': self.config['timezone'],
                'PYTHONUNBUFFERED': '1',
                'PYTHONPATH': '/app'
            })

            # コマンド実行
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=3600,  # 1時間でタイムアウト
                env=env,
                cwd='/app'
            )

            if result.returncode == 0:
                self.logger.info(f"水路通報システム実行成功: {job_type}")
                if result.stdout:
                    self.logger.info(f"実行結果: {result.stdout}")
                return True
            else:
                self.logger.error(f"水路通報システム実行失敗: {job_type}")
                self.logger.error(f"エラー出力: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            self.logger.error(f"水路通報システム実行タイムアウト: {job_type}")
            return False
        except Exception as e:
            self.logger.error(f"水路通報システム実行中にエラー: {job_type} - {str(e)}")
            return False

    def daily_job(self):
        """日次ジョブの実行"""
        self.logger.info("日次ジョブを開始します")

        success = self.run_waterway_system(
            job_type='daily',
            regions=self.config['default_regions']
        )

        if success:
            self.logger.info("日次ジョブが正常に完了しました")
        else:
            self.logger.error("日次ジョブが失敗しました")

        self.log_execution_status('daily', success)

    def weekly_job(self):
        """週次ジョブの実行"""
        self.logger.info("週次まとめジョブを開始します")

        success = self.run_waterway_system(
            job_type='weekly',
            regions=self.config['default_regions']
        )

        if success:
            self.logger.info("週次まとめジョブが正常に完了しました")
        else:
            self.logger.error("週次まとめジョブが失敗しました")

        self.log_execution_status('weekly', success)

    def health_check(self):
        """システムヘルスチェック"""
        try:
            current_time = datetime.now(JST)

            # ディスク容量チェック
            disk_usage = self.check_disk_usage()

            # ログファイルサイズチェック
            log_size = self.check_log_size()

            # データベース接続チェック
            db_status = self.check_database()

            health_info = {
                'timestamp': current_time.isoformat(),
                'disk_usage': disk_usage,
                'log_size_mb': log_size,
                'database_status': db_status,
                'scheduler_status': 'running'
            }

            self.logger.info(f"ヘルスチェック完了: {json.dumps(health_info, ensure_ascii=False)}")

        except Exception as e:
            self.logger.error(f"ヘルスチェック中にエラー: {str(e)}")

    def check_disk_usage(self) -> Dict[str, Any]:
        """ディスク使用量チェック"""
        try:
            import shutil
            total, used, free = shutil.disk_usage('/app')

            return {
                'total_gb': round(total / (1024**3), 2),
                'used_gb': round(used / (1024**3), 2),
                'free_gb': round(free / (1024**3), 2),
                'usage_percent': round((used / total) * 100, 2)
            }
        except Exception:
            return {'error': 'ディスク使用量取得エラー'}

    def check_log_size(self) -> float:
        """ログファイルサイズチェック"""
        try:
            log_path = Path('./logs')
            total_size = sum(f.stat().st_size for f in log_path.glob('*.log'))
            return round(total_size / (1024**2), 2)  # MB
        except Exception:
            return 0.0

    def check_database(self) -> str:
        """データベース接続チェック"""
        try:
            import sqlite3
            db_path = os.getenv('DB_PATH', './data/waterway_notices.db')

            if not os.path.exists(db_path):
                return 'データベースファイルが見つかりません'

            conn = sqlite3.connect(db_path, timeout=5.0)
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM sqlite_master WHERE type="table"')
            table_count = cursor.fetchone()[0]
            conn.close()

            return f'正常 (テーブル数: {table_count})'

        except Exception as e:
            return f'エラー: {str(e)}'

    def log_execution_status(self, job_type: str, success: bool):
        """実行状況のログ記録"""
        status_file = Path('./logs/execution_status.json')

        try:
            # 既存の状況を読み込み
            if status_file.exists():
                with open(status_file, 'r', encoding='utf-8') as f:
                    status_data = json.load(f)
            else:
                status_data = {'executions': []}

            # 新しい実行情報を追加
            execution_info = {
                'timestamp': datetime.now(JST).isoformat(),
                'job_type': job_type,
                'success': success,
                'dry_run': self.config['dry_run']
            }

            status_data['executions'].append(execution_info)

            # 古い記録を削除（最新の100件を保持）
            status_data['executions'] = status_data['executions'][-100:]

            # ファイルに保存
            with open(status_file, 'w', encoding='utf-8') as f:
                json.dump(status_data, f, ensure_ascii=False, indent=2)

        except Exception as e:
            self.logger.error(f"実行状況ログ記録エラー: {str(e)}")

    def setup_schedule(self):
        """スケジュールの設定"""
        # 日次ジョブ: 毎日06:30 JST
        schedule.every().day.at(self.config['daily_time']).do(self.daily_job).tag('daily')

        # 週次ジョブ: 毎週金曜09:30 JST
        getattr(schedule.every(), self.config['weekly_day'].lower()).at(self.config['weekly_time']).do(self.weekly_job).tag('weekly')

        # ヘルスチェック: 毎時間
        schedule.every().hour.do(self.health_check).tag('health')

        # スケジュール情報をログ出力
        self.logger.info("スケジュール設定完了:")
        self.logger.info(f"  - 日次ジョブ: 毎日 {self.config['daily_time']} JST")
        self.logger.info(f"  - 週次ジョブ: 毎週{self.config['weekly_day']} {self.config['weekly_time']} JST")
        self.logger.info(f"  - ヘルスチェック: 毎時間")
        self.logger.info(f"  - DRY_RUNモード: {'有効' if self.config['dry_run'] else '無効'}")

    def run_scheduler(self):
        """スケジューラーのメイン実行"""
        self.setup_schedule()

        self.logger.info("水路通報自動配信スケジューラーを開始します")

        try:
            while self.is_running:
                schedule.run_pending()
                time.sleep(60)  # 1分間隔でチェック

        except KeyboardInterrupt:
            self.logger.info("キーボード割り込みによりスケジューラーが停止されました")
        except Exception as e:
            self.logger.error(f"スケジューラー実行中にエラー: {str(e)}")
        finally:
            self.logger.info("水路通報自動配信スケジューラーが終了しました")

    def run_manual_job(self, job_type: str, regions: str = 'all', dry_run: bool = True):
        """手動ジョブ実行"""
        self.logger.info(f"手動ジョブ実行: {job_type} - 地域: {regions} - DRY_RUN: {dry_run}")

        success = self.run_waterway_system(
            job_type=job_type,
            regions=regions,
            dry_run=dry_run
        )

        if success:
            self.logger.info(f"手動ジョブが正常に完了しました: {job_type}")
        else:
            self.logger.error(f"手動ジョブが失敗しました: {job_type}")

        return success

def main():
    """メイン関数"""
    scheduler = WaterwayScheduler()

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == 'daily':
            # 日次ジョブを即座に実行
            regions = sys.argv[2] if len(sys.argv) > 2 else 'all'
            dry_run = '--dry-run' in sys.argv
            scheduler.run_manual_job('daily', regions, dry_run)

        elif command == 'weekly':
            # 週次ジョブを即座に実行
            regions = sys.argv[2] if len(sys.argv) > 2 else 'all'
            dry_run = '--dry-run' in sys.argv
            scheduler.run_manual_job('weekly', regions, dry_run)

        elif command == 'health':
            # ヘルスチェックを実行
            scheduler.health_check()

        elif command == 'test':
            # テスト実行
            scheduler.run_manual_job('daily', 'tokyo', dry_run=True)

        else:
            print("使用方法:")
            print("  python scheduler.py [scheduler|daily|weekly|health|test] [region] [--dry-run]")
            print("")
            print("コマンド:")
            print("  scheduler  : スケジューラーを開始（デフォルト）")
            print("  daily      : 日次ジョブを即座に実行")
            print("  weekly     : 週次ジョブを即座に実行")
            print("  health     : ヘルスチェックを実行")
            print("  test       : テスト実行（東京地域、dry-run）")
            print("")
            print("地域:")
            print("  tokyo, yokohama, nagoya, osaka, kobe, shimonoseki,")
            print("  sapporo, sendai, hiroshima, all")
            sys.exit(1)
    else:
        # デフォルトはスケジューラー実行
        scheduler.run_scheduler()

if __name__ == "__main__":
    main()