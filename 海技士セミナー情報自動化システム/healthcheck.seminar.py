#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
해기사 세미나 자동화 시스템 - 헬스체크
Author: Manus AI
Date: 2025-09-26
"""

import sqlite3
import sys
import os
from datetime import datetime, timedelta
import pytz

# 일본 표준시 타임존 설정
JST = pytz.timezone('Asia/Tokyo')

def health_check():
    """시스템 헬스체크"""
    try:
        # 환경 변수에서 DB 경로 가져오기
        db_path = os.environ.get('DB_PATH', '/app/data/seminar_automation.db')
        
        # 데이터베이스 연결 확인
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 기본 테이블 존재 확인
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        required_tables = ['regions', 'sources', 'seminars', 'subscribers', 'subscriber_routing', 'seminar_notifications']
        
        for table in required_tables:
            if table not in tables:
                print(f"ERROR: Required table '{table}' not found")
                sys.exit(1)
        
        # 최근 24시간 내 활동 확인 (선택사항)
        cutoff_time = datetime.now(JST) - timedelta(hours=24)
        cursor.execute('SELECT COUNT(*) FROM seminars WHERE created_at > ?', (cutoff_time,))
        recent_seminars = cursor.fetchone()[0]
        
        conn.close()
        
        print(f"OK: Database connection successful, {len(tables)} tables found, {recent_seminars} recent seminars")
        sys.exit(0)
        
    except Exception as e:
        print(f"ERROR: Health check failed - {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    health_check()
