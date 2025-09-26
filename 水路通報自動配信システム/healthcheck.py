#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
水路通報自動配信システム - ヘルスチェック
"""

import os
import sys
import sqlite3
import requests
from datetime import datetime
import json

def check_database():
    """データベース接続チェック"""
    try:
        db_path = os.getenv('DB_PATH', './data/waterway_notices.db')
        if not os.path.exists(db_path):
            return False, "データベースファイルが見つかりません"

        conn = sqlite3.connect(db_path, timeout=5.0)
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM sqlite_master WHERE type="table"')
        table_count = cursor.fetchone()[0]
        conn.close()

        return True, f"データベース正常 (テーブル数: {table_count})"
    except Exception as e:
        return False, f"データベースエラー: {str(e)}"

def check_disk_space():
    """ディスク容量チェック"""
    try:
        import shutil
        total, used, free = shutil.disk_usage('/app')
        free_percent = (free / total) * 100

        if free_percent < 10:
            return False, f"ディスク容量不足: {free_percent:.1f}%"

        return True, f"ディスク容量正常: {free_percent:.1f}% 空き"
    except Exception as e:
        return False, f"ディスク容量チェックエラー: {str(e)}"

def check_log_files():
    """ログファイルチェック"""
    try:
        log_dir = '/app/logs'
        if not os.path.exists(log_dir):
            return False, "ログディレクトリが見つかりません"

        log_files = [f for f in os.listdir(log_dir) if f.endswith('.log')]
        if not log_files:
            return False, "ログファイルが見つかりません"

        return True, f"ログファイル正常: {len(log_files)}個"
    except Exception as e:
        return False, f"ログファイルチェックエラー: {str(e)}"

def main():
    """メインヘルスチェック"""
    health_status = {
        'timestamp': datetime.now().isoformat(),
        'status': 'healthy',
        'checks': {}
    }

    # 各種チェック実行
    checks = [
        ('database', check_database),
        ('disk_space', check_disk_space),
        ('log_files', check_log_files)
    ]

    overall_healthy = True

    for check_name, check_func in checks:
        try:
            is_healthy, message = check_func()
            health_status['checks'][check_name] = {
                'status': 'ok' if is_healthy else 'error',
                'message': message
            }
            if not is_healthy:
                overall_healthy = False
        except Exception as e:
            health_status['checks'][check_name] = {
                'status': 'error',
                'message': f"チェック実行エラー: {str(e)}"
            }
            overall_healthy = False

    health_status['status'] = 'healthy' if overall_healthy else 'unhealthy'

    # 結果出力
    print(json.dumps(health_status, ensure_ascii=False, indent=2))

    # 終了コード
    sys.exit(0 if overall_healthy else 1)

if __name__ == "__main__":
    main()