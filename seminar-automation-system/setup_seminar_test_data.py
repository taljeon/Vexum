#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
해기사 세미나 자동화 시스템 - 테스트 데이터 설정
"""

import sqlite3
import os
from datetime import datetime

def setup_database():
    """데이터베이스 및 테이블 초기화"""
    db_path = os.getenv('DB_PATH', '/app/data/seminar_automation.db')

    # 데이터 디렉토리 생성
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 세미나 정보 테이블 생성
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS seminar_notices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bureau_name TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            date_info TEXT,
            url TEXT,
            notice_id TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 발송 기록 테이블 생성
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_sent_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notice_id TEXT NOT NULL,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            recipient TEXT,
            status TEXT
        )
    ''')

    conn.commit()
    conn.close()

    print("✅ 데이터베이스 초기화 완료")

if __name__ == "__main__":
    setup_database()