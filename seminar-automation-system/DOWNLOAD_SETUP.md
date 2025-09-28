# 🚢 해기사 세미나 자동화 시스템 - 다운로드 & 설치 가이드

## 🎯 빠른 시작 (3단계로 완료!)

### 1️⃣ 시스템 다운로드
```bash
# GitHub에서 다운로드
git clone https://github.com/taljeon/Vexum.git
cd Vexum/seminar-automation-system

# 또는 ZIP 파일 다운로드 후
unzip Vexum-main.zip
cd Vexum-main/seminar-automation-system
```

### 2️⃣ 자동 설치 실행
```bash
# 실행 권한 부여 후 설치
chmod +x install.sh
./install.sh
```

**설치 중 입력 정보:**
- 📧 **받을 이메일**: your-email@company.com
- 📨 **Gmail 주소**: your-gmail@gmail.com
- 🔑 **Gmail 앱 패스워드**: abcdefghijklmnop (16자리)

### 3️⃣ 완료! 🎉
- 시스템 자동 시작됨
- 매일 오전 9시에 해기사 세미나 정보 자동 수집
- 즉시 테스트 메일 발송 가능

---

## 📋 사전 준비사항

### 필수 소프트웨어
- ✅ **Docker Desktop** 설치됨
- ✅ **Git** 설치됨 (선택사항)
- ✅ **인터넷 연결**

### Gmail 설정 (5분 소요)
1. **Gmail 로그인** → **계정 관리**
2. **보안** → **2단계 인증** 활성화
3. **앱 패스워드** 생성:
   - 앱 선택: 기타(사용자 설정)
   - 이름: "해기사세미나시스템"
   - 생성된 **16자리 패스워드** 복사 (abcdefghijklmnop 형태)

---

## 🛠️ 시스템 관리 명령어

| 명령어 | 설명 | 사용 예시 |
|-------|------|----------|
| `./start.sh` | 시스템 시작 | `./start.sh` |
| `./stop.sh` | 시스템 중지 | `./stop.sh` |
| `./restart.sh` | 시스템 재시작 | `./restart.sh` |
| `./test.sh` | 테스트 메일 발송 | `./test.sh` |
| `./logs.sh` | 실시간 로그 확인 | `./logs.sh` |

---

## 🔧 고급 설정

### 수동 설정 (.env 파일 편집)
```bash
# .env 파일 편집
nano .env

# 또는
vim .env
```

**주요 설정 항목:**
```bash
# 메일 수신자
TEST_EMAIL=your-email@company.com

# Gmail SMTP 설정
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-16-digit-app-password
FROM_EMAIL=your-gmail@gmail.com

# 운용 모드
DRY_RUN=false  # false=실제발송, true=테스트만
```

### Docker 명령어 (고급 사용자)
```bash
# 시스템 상태 확인
docker-compose -f docker-compose.production.yml ps

# 즉시 실행 (테스트)
docker-compose -f docker-compose.production.yml exec seminar-automation python seminar_scheduler.py --production

# 로그 실시간 확인
docker-compose -f docker-compose.production.yml logs -f

# 완전 삭제 (데이터 포함)
docker-compose -f docker-compose.production.yml down -v
```

---

## 🔍 문제 해결

### ❌ "Docker가 없습니다" 오류
```bash
# Docker Desktop 설치 확인
docker --version
docker-compose --version

# 설치되지 않은 경우: https://docker.com 에서 Docker Desktop 다운로드
```

### ❌ "메일이 안 옵니다"
1. **스팸함** 확인
2. **Gmail 앱 패스워드** 재확인 (16자리)
3. **2단계 인증** 활성화 확인
4. 테스트 실행: `./test.sh`

### ❌ "권한이 없습니다" 오류
```bash
# 실행 권한 부여
chmod +x *.sh

# 또는 개별 파일
chmod +x install.sh start.sh stop.sh
```

### ❌ "포트가 사용 중입니다" 오류
```bash
# 기존 시스템 중지
./stop.sh

# 또는 모든 Docker 컨테이너 중지
docker stop $(docker ps -aq)
```

---

## 📊 운영 정보

### 자동 스케줄
- 📅 **매일 09:00 JST**: 해기사 세미나 정보 수집 및 메일 발송
- 🔍 **매시간**: 시스템 상태 점검
- 💾 **지속적**: 수집 데이터 SQLite DB 저장

### 수집 대상
- 🏢 **10개 지방운수국**: 홋카이도, 도호쿠, 간토, 호쿠리쿠신에츠, 주부, 긴키, 주고쿠, 시코쿠, 큐슈, 오키나와
- 📋 **세미나 유형**: 해기사 면허 갱신, 신규 취득, 특별 연수
- 🔄 **중복 방지**: 이미 발송된 정보는 재발송하지 않음

### 시스템 요구사항
- **CPU**: 1코어 이상
- **메모리**: 512MB 이상
- **디스크**: 1GB 이상
- **네트워크**: SMTP(587포트) 접근 가능

---

## 🚀 즉시 사용하기

### Windows 사용자
1. **PowerShell** 또는 **명령 프롬프트** 실행
2. 다운로드 폴더로 이동: `cd Downloads\Vexum-main\seminar-automation-system`
3. 설치 실행: `.\install.sh` (Git Bash 사용) 또는 Docker Desktop에서 실행

### Mac/Linux 사용자
1. **터미널** 실행
2. 다운로드 폴더로 이동: `cd ~/Downloads/Vexum-main/seminar-automation-system`
3. 설치 실행: `./install.sh`

---

## 📞 지원

### 문제 발생 시
1. **로그 확인**: `./logs.sh`
2. **시스템 재시작**: `./restart.sh`
3. **테스트 실행**: `./test.sh`

### 완전 재설치
```bash
# 기존 시스템 완전 삭제
./stop.sh
docker-compose -f docker-compose.production.yml down -v

# 재설치
./install.sh
```

**🎯 이제 해기사 세미나 정보를 놓치지 마세요!**