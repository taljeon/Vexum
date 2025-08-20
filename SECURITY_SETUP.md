# 🔒 보안 설정 가이드

## Google Apps Script 프로젝트 보안 설정

### 1. 스크립트 속성(Script Properties) 설정

Google Apps Script에서 민감한 정보를 안전하게 저장하기 위해 다음 단계를 따르세요:

#### 📝 설정 방법:

1. **Apps Script 편집기** 열기
2. **프로젝트 설정 ⚙️** 클릭
3. **스크립트 속성** 섹션으로 이동
4. **스크립트 속성 추가** 클릭

#### 🔑 필수 설정 항목들:

| 속성 이름 | 설명 | 예시 값 |
|----------|------|---------|
| `GEMINI_API_KEY` | Gemini API 키 | `AIzaSyC-xxxxxxxxxxxxxxxxxxxxxxxx` |
| `EMAIL_RECIPIENTS` | 이메일 수신자 | `user@example.com, admin@company.com` |
| `EMAIL_SUBJECT` | 이메일 제목 (선택) | `PDF 처리 결과 보고` |
| `ADMIN_EMAIL` | 관리자 이메일 (선택) | `admin@company.com` |

### 2. Gemini API 키 발급

1. [Google AI Studio](https://makersuite.google.com/) 접속
2. **API 키 생성** 클릭
3. 생성된 키를 **안전한 곳에 보관**
4. Apps Script 스크립트 속성에 `GEMINI_API_KEY`로 저장

### 3. 보안 체크리스트 ✅

- [ ] API 키가 코드에 하드코딩되지 않았는지 확인
- [ ] 스크립트 속성에 모든 민감한 정보 저장
- [ ] GitHub에 민감한 정보가 커밋되지 않았는지 확인
- [ ] 프로젝트를 private 저장소로 설정 (권장)
- [ ] .gitignore에 .env, *.key 파일 추가

### 4. 코드에서 안전하게 사용하기

```javascript
// ✅ 올바른 방법 - 스크립트 속성 사용
function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
}

// ❌ 잘못된 방법 - 하드코딩
const apiKey = 'AIzaSyC-xxxxxxxxxxxxxxxxxxxxxxxx'; // 절대 이렇게 하지 마세요!
```

### 5. 보안 검증

설정이 올바르게 되었는지 확인하려면:

1. Apps Script 편집기에서 `validateConfiguration()` 함수 실행
2. 스프레드시트에서 **"설정검증"** 메뉴 클릭
3. 모든 필수 설정이 정상인지 확인

## ⚠️ 보안 주의사항

### 절대 하지 말아야 할 것들:
- API 키를 코드에 직접 작성
- GitHub 공개 저장소에 키 업로드  
- API 키를 이메일이나 채팅으로 공유
- 스크린샷에 API 키 노출

### 키가 노출된 경우:
1. **즉시 해당 키를 무효화/삭제**
2. 새로운 키 생성
3. Git 히스토리에서 키 제거 (필요시)
4. 이 문서의 정리 방법 참조

## 🛠 문제 해결

### 일반적인 오류들:

**"GEMINI_API_KEY not found in Script Properties"**
→ 스크립트 속성에 API 키가 설정되지 않음. 위 설정 방법 참조

**"EMAIL_RECIPIENTS not found in Script Properties"**  
→ 이메일 수신자가 설정되지 않음. 위 설정 방법 참조

**API 응답 오류**
→ API 키가 유효하지 않거나 할당량 초과. Google AI Studio에서 키 상태 확인

## 📞 지원

설정에 문제가 있거나 보안 관련 질문이 있으면:
1. 스프레드시트의 "시스템 상태 확인" 메뉴 실행
2. "에러 로그 확인" 메뉴로 상세 오류 확인
3. GitHub Issues에서 도움 요청 (민감한 정보는 제외하고)