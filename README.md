# 조각 배분 (time_part)

일주일 시간을 **"조각"(1조각 = 30분)** 단위로 나눠 계획하고, 요일에 배치하고,
실제로 지켰는지 조각 하나하나 체크하고, 주별 통계로 돌아보는 웹앱.

폰과 컴퓨터에서 같은 URL로 접속하면 서버(Neon Postgres)에 저장된 같은 데이터를 본다.

## 화면

| 탭 | 하는 일 |
|----|---------|
| **배치** | 주를 고르고 요일별로 카테고리 조각을 +/- 로 배치. "남음 N"으로 카테고리 주간 목표 대비 잔여 표시 |
| **체크** | 그 주에 배치된 조각을 하나씩 체크. 달성률 막대 |
| **통계** | 최근 12주 누적 달성률 + 주별 배치/달성/달성률, 카테고리별 분해 |
| **설정** | 주당 총 조각 수, 카테고리별 배분(이름·조각수·색). 수정 전까지 유지됨 |

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local     # 값 채우기 (아래)
npm run db:migrate                    # 스키마 생성 (idempotent)
npm run dev                           # http://localhost:3000
```

### 환경변수 (.env.local)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | Neon 대시보드 → Connection Details → **Pooled connection** 문자열 |
| `APP_PASSWORD` | 앱 로그인 비밀번호 |
| `AUTH_SECRET` | 아무 긴 랜덤 문자열 (세션 쿠키 값 파생용) |

## Neon 준비

1. https://neon.tech 가입 → 새 프로젝트 생성 (region은 아시아면 `ap-southeast-1` 등)
2. 생성된 **Pooled connection** 문자열을 `DATABASE_URL`에 넣기
3. `npm run db:migrate` 실행 → `settings` / `categories` / `slots` 테이블 생성

## Vercel 배포

1. 이 폴더를 GitHub 저장소로 push
2. https://vercel.com → New Project → 저장소 선택
3. Environment Variables 에 `DATABASE_URL`, `APP_PASSWORD`, `AUTH_SECRET` 세 개 추가
4. Deploy. 배포 후 최초 1회 스키마 생성:
   - 로컬에서 프로덕션 `DATABASE_URL`을 `.env.local`에 잠깐 넣고 `npm run db:migrate`, 또는
   - Neon SQL Editor에 `db/schema.sql` 내용을 붙여넣어 실행
5. 폰 브라우저로 배포 URL 접속 → "홈 화면에 추가"하면 앱처럼 사용

## 구조

```
app/
  page.tsx            배치 화면
  check/page.tsx      체크 화면
  stats/page.tsx      통계 화면
  settings/page.tsx   설정 화면
  login/page.tsx      비밀번호 로그인
  api/                route handlers (settings, categories, week, slots, stats, login)
lib/
  db.ts              Neon 클라이언트(지연 초기화)
  auth.ts            비밀번호 확인 + 세션 토큰
  week.ts            월요일 계산 등 날짜 유틸
  client.ts          프론트 fetch 래퍼 + 타입
proxy.ts             인증 미들웨어(로그인 안 하면 /login 리다이렉트)
db/schema.sql        테이블 정의
scripts/migrate.mjs  스키마 적용 스크립트
```

## 데이터 모델

- **settings** — 싱글턴 행. `total_pieces` (주당 총 조각)
- **categories** — `name`, `pieces`(주간 목표 조각수), `color`, `sort_order`, `archived`
- **slots** — 배치된 조각 **한 개 = 한 행**. `week_start`(월요일), `weekday`(0=월..6=일), `category_id`, `checked`
