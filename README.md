# 문장 사다리

우리말로 쓴 생각을 **번역하지 않고**, 영어 어순의 구문(예: 사람은 / 먹는다 / 다양한 / 음식을)으로 나눈 뒤 한 칸씩 직접 영어 문장을 세우도록 돕는 AI 영어 작문 코치입니다.

## 폴더 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 학생이 쓰는 화면 (HTML 한 장) |
| `api/coach.js` | AI 코치 중계 서버 함수. API 키는 여기서만 쓰이고 학생 브라우저에는 노출되지 않아요 |
| `vercel.json` | Vercel 설정 (서버 함수 최대 실행 60초) |
| `.env.example` | 등록할 환경 변수 목록 (실제 키는 적지 마세요) |

## 배포 전에 준비할 것

1. **GitHub 계정**
2. **Vercel 계정**: GitHub 계정으로 가입하면 편해요.
3. **Anthropic API 키**
   - https://console.anthropic.com 에서 발급해요.
   - 결제 수단을 등록하고 크레딧을 충전해야 작동해요.
   - 학생들이 사용하는 만큼 요금이 나갑니다.

## 1단계: GitHub에 올리기

**방법 A. 웹에서 올리기 (명령어 없이)**
1. GitHub에서 **New repository**를 누르고 이름을 정해요. 예: `sentence-ladder`
2. 저장소 공개 여부를 정해요. Private로 만들어도 Vercel 배포는 됩니다.
3. 저장소 화면에서 **Add file → Upload files**를 눌러요.
4. 이 폴더의 파일을 **모두** 끌어다 놓고 **Commit changes**를 눌러요.
   - `api` 폴더는 폴더째 끌어다 놓아요.
   - `.gitignore`도 함께 올려요.
   - `.env` 파일이 있다면 절대 올리지 마세요.

**방법 B. 터미널**
```bash
cd sentence-ladder-app
git init
git add .
git commit -m "문장 사다리 첫 배포"
git branch -M main
git remote add origin https://github.com/<내아이디>/sentence-ladder.git
git push -u origin main
```

## 2단계: Vercel에 배포하기

1. https://vercel.com 에서 **Add New → Project**를 눌러요.
2. 방금 만든 GitHub 저장소를 **Import**해요.
3. Framework Preset은 **Other**로 둬요. 빌드 설정은 바꾸지 않아도 돼요.
4. **Environment Variables**에 아래 값을 추가해요.

| 이름 | 값 | 필수 여부 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 발급받은 API 키 (`sk-ant-...`) | 필수 |
| `ACCESS_CODE` | 수업 코드 (예: `class2026`) | 강력 권장 |
| `MODEL_DEFAULT` | 코치·생각 나누기에 쓸 모델 (기본 `claude-sonnet-5-5`) | 선택 |
| `MODEL_QUICK` | 단어 찾기에 쓸 빠른 모델 (기본 `claude-haiku-5-5`) | 선택 |
| `RATE_LIMIT_PER_10MIN` | IP 하나가 10분 동안 보낼 수 있는 요청 수 (기본 60) | 선택 |

5. **Deploy**를 눌러요. 1분쯤 지나면 `https://sentence-ladder-xxxx.vercel.app` 주소가 생겨요.

> 환경 변수를 나중에 바꿨다면 **Deployments → 최신 배포 → Redeploy**를 눌러야 반영돼요.

## 3단계: 수업에서 쓰기

- 학생에게 배포된 주소와 수업 코드를 알려 주세요. 학생은 시작 화면의 **수업 코드** 칸에 코드를 한 번 입력하면 돼요. 코드는 그 브라우저에 기억됩니다.
- 학습 기록은 각 학생의 브라우저에만 저장돼요. 과제 확인은 학생이 **기록 복사**로 붙여 내는 방식으로 받으세요. 예: 구글 클래스룸, 패들렛.
- 같은 파일을 claude.ai 안에서 열면 자동으로 Claude 계정의 AI를 쓰고, 수업 코드 칸은 숨겨져요.

## 비용과 안전

- **API 키는 GitHub에 절대 올리지 마세요.** Vercel 환경 변수에만 넣습니다.
- **수업 코드를 꼭 설정하세요.** 설정하지 않으면 주소를 아는 누구나 선생님의 API 크레딧을 쓸 수 있어요.
- Anthropic Console의 **Limits**에서 월 사용 한도를 정해 두면 예상 밖의 요금을 막을 수 있어요.
- IP별 요청 제한은 서버 인스턴스마다 따로 세는 대략적인 보호예요. 학교 와이파이처럼 여러 학생이 같은 IP를 쓰면 한도에 빨리 닿을 수 있으니, 학급 규모에 맞게 `RATE_LIMIT_PER_10MIN`을 늘려 주세요. 예: 30명이면 300.
- 학생이 입력한 글은 피드백을 만들기 위해 Anthropic API로 전송돼요. 학생에게 이름·연락처 같은 개인정보는 쓰지 않도록 안내해 주세요.

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| "수업 코드가 맞지 않아요" | `ACCESS_CODE` 값과 학생이 입력한 코드가 같은지, 바꾼 뒤 Redeploy 했는지 |
| "연결이 끊겼어요" | Vercel → 프로젝트 → **Logs**에서 `api/coach` 오류 확인. `ANTHROPIC_API_KEY is not set`이면 키 등록 후 Redeploy |
| 모델 오류 (404 등) | `MODEL_DEFAULT`, `MODEL_QUICK`를 Anthropic 문서의 현재 모델 이름으로 바꾸기 |
| "요청이 많아요" | `RATE_LIMIT_PER_10MIN` 값을 늘리거나 Anthropic Console의 사용 한도 확인 |
