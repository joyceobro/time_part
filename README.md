# 조각 배분 (time_part)

일주일 시간을 **"조각"(1조각 = 30분)** 단위로 나눠 계획하고, 요일에 배치하고,
실제로 지켰는지 조각 하나하나 체크하고, 주별 통계로 돌아보는 웹앱.

**다중 사용자.** 각 사용자는 Google 로그인으로 접속하고, 자기만의 독립된 주간
배치·통계를 가진다 (공유·협업 없음). 폰과 컴퓨터에서 같은 계정으로 로그인하면
Neon Postgres에 저장된 같은 데이터를 본다.

## 화면

| 탭 | 하는 일 |
|----|---------|
| **배치** | 주를 고르고, 창고의 조각을 요일로 **드래그**(또는 탭)해서 배치. 요일 간 이동, 창고로 되돌리기 |
| **체크** | 그 주에 배치된 조각을 하나씩 체크. 달성률 막대 |
| **통계** | 최근 12주 누적 달성률 + 주별 배치/달성/달성률, 카테고리별 분해 |
| **설정** | 주당 총 조각 수, 카테고리별 배분(이름·조각수·색). 수정 전까지 유지됨 |

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local     # 값 채우기 (아래)
npm run db:migrate                    # 스키마 생성/변경 (idempotent)
npm run dev                           # http://localhost:3000
```

### 환경변수 (.env.local)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | Neon → Connect → **Pooled connection** 문자열 |
| `AUTH_SECRET` | 긴 랜덤 문자열. `npx auth secret` 로 생성 |
| `AUTH_URL` | 앱 기본 URL. 로컬 `http://localhost:3000`, 프로덕션은 배포 URL |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth 클라이언트 (아래) |

### Google OAuth 준비

1. Google Cloud Console → **APIs & Services → OAuth consent screen** 설정 (External)
2. **Credentials → Create Credentials → OAuth client ID → Web application**
3. **Authorized redirect URIs** 에 추가:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<배포도메인>/api/auth/callback/google`
4. 발급된 Client ID / Secret 을 `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` 에 넣기

## Neon 준비

1. https://neon.tech 프로젝트 생성 → **Pooled connection** 문자열을 `DATABASE_URL` 에
2. `npm run db:migrate` → `user_settings` / `categories` / `slots` 테이블·컬럼 생성
3. (선택) 다중 사용자 전환 전 데이터를 특정 계정에 귀속:
   `LEGACY_USER=me@gmail.com npm run db:migrate`

## Vercel 배포

1. GitHub 저장소로 push (auto-deploy를 원하면 Vercel 대시보드에서 repo 연결)
2. Environment Variables: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`(배포 URL),
   `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
3. `vercel --prod` (또는 push 시 자동 배포)
4. Google OAuth redirect URI에 배포 도메인 콜백이 들어있는지 확인
5. 폰 브라우저로 배포 URL 접속 → Google 로그인 → "홈 화면에 추가"

## 구조

```
auth.ts               Auth.js v5 설정 (Google, JWT 세션, 어댑터 없음) + currentUserId()
proxy.ts              라우트 보호 미들웨어 (미로그인 → /login, /api → 401)
app/
  page.tsx            배치 (창고 + 드래그/탭)
  check|stats|settings/page.tsx
  login/page.tsx      Google 로그인 버튼
  api/
    auth/[...nextauth]/route.ts   Auth.js 핸들러
    settings|categories|week|slots|stats/…      전부 user_id 로 스코프
lib/
  db.ts              Neon 클라이언트 (지연 초기화)
  week.ts            월요일 계산 등 날짜 유틸
  client.ts          프론트 fetch 래퍼 + 타입
db/schema.sql        테이블 정의
scripts/migrate.mjs  스키마 적용 + LEGACY_USER 백필
```

## 데이터 모델 (모두 `user_id` = 로그인한 사용자의 소문자 Google 이메일 로 스코프)

- **user_settings** — `user_id` PK, `total_pieces` (주당 총 조각)
- **categories** — `user_id`, `name`, `pieces`(주간 목표), `color`, `sort_order`, `archived`
- **slots** — 배치된 조각 **한 개 = 한 행**. `user_id`, `week_start`(월요일), `weekday`(0=월..6=일), `category_id`, `checked`
