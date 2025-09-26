# 🔒 보안 환경 설정 가이드

## ⚠️ 중요: 개인정보 보호

**절대로 실제 메일 주소, 패스워드, API 키를 Git에 커밋하지 마세요!**

## 🛡️ 안전한 설정 방법

### 1. 환경 파일 생성

```bash
# 템플릿에서 실제 환경 파일 생성
cd "/Users/yuhyeon/Downloads/Vexum/水路通報自動配信システム"
cp .env.template .env
```

### 2. 실제 정보 입력

`.env` 파일을 열어서 다음 항목들을 **실제 값**으로 변경:

```bash
# 메일 설정 - 실제 Gmail 정보
SMTP_USERNAME=your-actual-email@gmail.com
SMTP_PASSWORD=your-16-digit-app-password
SMTP_FROM_EMAIL=your-actual-email@gmail.com

# Slack 설정 - 실제 Webhook URL
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/REAL/WEBHOOK

# API 토큰 - 안전한 랜덤 문자열
API_TOKEN=$(openssl rand -hex 32)
```

### 3. Gmail 앱 패스워드 생성

1. [Google 계정 설정](https://myaccount.google.com/security) 접속
2. **2단계 인증** 활성화 (필수)
3. **앱 패스워드** 생성
4. 생성된 16자리 패스워드를 `.env`에 입력

### 4. 보안 확인

```bash
# .env 파일이 Git에 추적되지 않는지 확인
git status

# .gitignore에 .env가 포함되어 있는지 확인
cat .gitignore | grep "\.env"
```

**예상 결과:**
- `.env` 파일이 `git status`에 나타나지 않아야 함
- `.gitignore`에 `.env` 항목이 있어야 함

## 🧪 안전한 테스트 방법

### 1. DRY-RUN 모드로 먼저 테스트

```bash
# .env에서 DRY_RUN=true 확인
grep "DRY_RUN" .env

# 테스트 실행 (실제 메일 전송 안 함)
python3 simple_email_test.py
```

### 2. 실제 메일 테스트

```bash
# .env에서 DRY_RUN=false로 변경 후
python3 simple_email_test.py
```

## 📋 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] `git status`에서 `.env` 파일이 보이지 않음
- [ ] 실제 Gmail 계정에 2단계 인증 활성화됨
- [ ] 16자리 Gmail 앱 패스워드 생성됨
- [ ] `.env` 파일에 실제 정보 입력됨
- [ ] DRY-RUN 모드로 먼저 테스트함

## 🚨 보안 위반 시 대처법

**만약 실수로 민감한 정보를 Git에 커밋한 경우:**

```bash
# 즉시 해당 파일을 Git에서 제거
git rm --cached .env

# 커밋 히스토리에서 완전 제거 (필요시)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# 강제 푸시 (주의: 협업 시 위험)
git push origin --force --all
```

**GitHub에 이미 푸시된 경우:**
1. 즉시 Gmail 앱 패스워드 재생성
2. Slack Webhook URL 재생성
3. API 토큰 변경
4. GitHub에서 해당 커밋 히스토리 정리

## 💡 추가 보안 팁

1. **정기적인 키 교체**: 3개월마다 앱 패스워드 재생성
2. **접근 권한 제한**: 필요한 사람만 `.env` 파일 접근
3. **백업 암호화**: `.env` 백업 시 암호화 저장
4. **로그 점검**: 민감한 정보가 로그에 출력되지 않는지 확인

**🔒 보안은 선택이 아닌 필수입니다!**