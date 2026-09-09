# 조각 배분 (time_part) — 개발 기록

기록 작성: 2026-09-09
문서(아티팩트): https://claude.ai/code/artifact/cf9db1ac-a7f5-4074-bdfb-587591227192

한 줄짜리 스펙 파일에서 시작해 **스택 결정 → 구현 → Neon 연결·검증 → Vercel 배포 →
배치 화면 재설계 → 다중 사용자(Google 로그인) 전환**까지 진행했다. 현재 라이브
상태이며, 남은 결정은 OAuth 동의 화면을 공개(게시)할지 하나다.

| | |
|---|---|
| 라이브 | https://timepart.vercel.app — Google 로그인, 사용자별 독립 배치 |
| 스택 | Next.js 16 (App Router) · React 19 · Tailwind v4 · Auth.js v5 + Google · `@dnd-kit/core` |
| 데이터 | Neon Postgres (ap-southeast-1) · `@neondatabase/serverless` |
| 소스 | https://github.com/joyceobro/time_part |
| 배포 | Vercel `inwhites-projects/time_part` (hobby) · `vercel --prod` |
| 상태 | 배포됨 · 기존 데이터는 `seliscos@gmail.com` 계정에 귀속 완료 |

---

## 1. 무엇을 만들었나

1조각 = 30분. 설정에서 주당 총 조각 수와 카테고리별 배분을 정하고(수정 전까지 유지),
그 조각을 요일에 배치한 뒤 실제로 지켰는지 하나씩 체크한다.

| 화면 | 하는 일 |
|------|---------|
| **배치** | 창고에 쌓인 미배치 조각을 요일 칸으로 드래그(또는 탭)해 배치. 요일 간 이동, 창고로 되돌려 취소. 창고에 있는 만큼만 놓을 수 있어 계획 초과가 막힌다. |
| **체크** | 그 주에 배치된 조각을 한 개씩 체크. 달성률 막대와 요일별 `n/m` 표시. |
| **통계** | 최근 12주 누적 달성률, 주별 배치 대비 달성, 카테고리별 분해. |
| **설정** | 주당 총 조각 수, 카테고리(이름·목표 조각 수·색) 추가·수정·삭제. |

핵심 개념

- **조각(piece)** — 30분 단위. 배치된 조각 하나가 DB의 한 행.
- **주(week)** — 월요일 날짜(`week_start`) 기준. 요일은 0=월 … 6=일.
- **사용자 격리** — 모든 행이 `user_id`(로그인한 사람의 Google 이메일)로 스코프.
  공유·협업 없이 각자 독립.

---

## 2. 아키텍처

```
브라우저 (Next.js 화면 4개 + 로그인, lib/client fetch 래퍼)
        │
        ▼
API Routes ×8 — 매 요청 currentUserId()로 전 쿼리 user_id 스코프
        │
        ▼
Neon Postgres — user_settings · categories · slots

proxy.ts (Auth.js 미들웨어: 미로그인 → /login, /api → 401)
        ↕
Auth.js v5 (JWT 세션, DB 어댑터 없음)
        ↕
Google OAuth (scope: openid · email · profile)
```

- 별도 `users` 테이블 없음 — 세션의 이메일이 곧 `user_id`.
- `lib/db.ts`는 지연 프록시라 빌드 시 `DATABASE_URL`이 필요 없다.

주요 파일

| 파일 | 역할 |
|------|------|
| `auth.ts` | NextAuth 설정(Google, JWT) + `currentUserId()` |
| `proxy.ts` | Auth.js `auth()` 래퍼 미들웨어 (Next 16에서 `middleware` → `proxy` 리네임) |
| `lib/db.ts` | Neon 지연 초기화 프록시 |
| `lib/week.ts` | `mondayOf` / `addDays` / `weekLabel` (UTC-정오 기준 날짜 계산) |
| `lib/client.ts` | 프론트 fetch 래퍼 + 타입 |
| `db/schema.sql`, `scripts/migrate.mjs` | 스키마 + `LEGACY_USER` 백필 |

API 라우트 (모두 `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `currentUserId()` 스코프)

- `GET/PUT /api/settings`
- `GET/POST /api/categories`, `PUT/DELETE /api/categories/[id]`
- `GET /api/week?start=YYYY-MM-DD` — 부트스트랩(settings + categories + slots)
- `POST /api/slots` (`delta` ±N), `PATCH /api/slots/[id]` (`{checked, weekday}`), `DELETE /api/slots/[id]`
- `GET /api/stats?weeks=12`
- `/api/auth/[...nextauth]`

---

## 3. 데이터 모델

모든 행이 `user_id`(로그인한 사용자의 소문자 Google 이메일)로 스코프.

**user_settings** — 사용자당 1행
| 컬럼 | 설명 |
|------|------|
| `user_id` | PK. 소문자 Google 이메일 |
| `total_pieces` | 주당 총 조각 수 |
| `updated_at` | 마지막 수정 |

**categories**
| 컬럼 | 설명 |
|------|------|
| `user_id` | 소유자 |
| `name` / `color` | 이름, 색 |
| `pieces` | 주간 목표 조각 수 |
| `sort_order` / `archived` | 정렬, 숨김 |

**slots** — 배치된 조각 1개 = 1행
| 컬럼 | 설명 |
|------|------|
| `user_id` | 소유자 |
| `week_start` | 그 주 월요일 (date) |
| `weekday` | 0=월 … 6=일 |
| `category_id` | FK → categories (on delete cascade) |
| `checked` | 지켰는지 여부 |

---

## 4. 만든 순서

### PHASE 01 — 스펙 파악
7줄짜리 `my.md`를 읽고 정리. **30분/조각, 조각 단위 체크, 서버·DB, 웹, 폰↔컴퓨터 동기화**를
확정. 원본은 `docs/spec.md`로 이동.

### PHASE 02 — 스택 결정 & 스캐폴딩
Next.js + Neon Postgres + Vercel + 단일 비밀번호로 결정. `create-next-app`으로 골격 생성
(App Router, Tailwind v4).

### PHASE 03 — 1차 구현
화면 4개 + API route handlers + 단일 비번 인증(`proxy.ts`, `sha256(pw::secret)` 쿠키).
요일 카드 + `+/−` 스텝퍼 UI.

- **처리:** `neon()`이 빌드 타임에 `DATABASE_URL`을 요구 → `lib/db.ts`를 지연 초기화
  프록시로. Next 16에서 `middleware` → `proxy` 리네임.

### PHASE 04 — Neon 연결 & 전 기능 검증
사용자가 pooled 연결 문자열 제공. 마이그레이션 스크립트 버그 1건(주석으로 시작하는 첫
SQL 문을 통째로 버림) 수정. 로그인·설정·카테고리 CRUD·슬롯 배치/제거·체크 토글·통계
집계를 **실제 DB로 전부 확인**. 한글 정상.

### PHASE 05 — 1차 배포
`gh`·`vercel` CLI 없음 → `vercel` CLI 설치, 사용자가 `vercel login`, 프로젝트 생성,
환경변수 3개 설정, `vercel --prod`. https://timepart.vercel.app 라이브. 강한 랜덤
비밀번호 생성.

### PHASE 06 — GitHub 연결
`gh` CLI 설치 불가(관리자 권한 필요). 수동으로 remote 추가 후 push 시도 → 403.

- **막힌 지점:** 이 PC에 GitHub 계정이 **둘**. 기본 `git@github.com`은 `House-of-Jung`
  (work 키)으로 인증돼 `joyceobro` 소유 repo에 push 거부.
- **해결:** `~/.ssh/config`의 `github.com-joyceobro` 호스트 별칭 사용 →
  `origin = git@github.com-joyceobro:joyceobro/time_part.git`. push 성공.
  (Vercel↔GitHub 자동배포 연결은 브라우저 승인이 필요해 보류 — 재배포는 `vercel --prod` 수동.)

### PHASE 07 — 배치 화면 재설계
요청: "창고에서 조각을 하나씩 끌어와 요일에 배치". `@dnd-kit/core` 도입 — 카테고리별
미배치 조각 pile → 요일 드롭존, 요일↔요일 이동, 요일→창고 제거. `PATCH /api/slots/:id`에
`{weekday}` 추가.

- **막힌 지점:** 자동화 도구의 합성 드래그 이벤트로는 dnd-kit이 활성화되지 않음
  (실제 기기·마우스에서는 정상).
- **해결:** 탭 방식 폴백 추가 — 조각을 탭해 집고, 요일을 탭해 배치. 탭 흐름은 배치·저장까지
  E2E 확인. 재배포.

### PHASE 08 — 다중 사용자 전환
결정: **Auth.js v5 + Google (JWT, 어댑터 없음)**, 기존 데이터는 `seliscos@gmail.com`에 이관.

- 단일 비번 제거(`lib/auth.ts`, `/api/login`). `auth.ts` 신설, `proxy.ts`를 Auth.js
  `auth()` 래퍼로. API 8개 전부 `user_id` 스코프 + 소유권 체크.
- 스키마: `user_settings` 신설, `categories`·`slots`에 `user_id` 컬럼. 로그인 페이지 =
  Google 버튼, 로그아웃 = `signOut` 서버 액션.
- 스키마 마이그레이션 → Neon 반영. `LEGACY_USER=…` 백필로 카테고리 4·슬롯 8·총 35조각을
  계정에 귀속(NULL 0건). Vercel 환경변수에 Google 자격증명 추가, `APP_PASSWORD` 삭제,
  `vercel --prod`.
- **검증:** 서버측 인증 흐름 라이브 확인 — 미로그인 리다이렉트·401, `signin`이 올바른
  client_id·redirect_uri·PKCE·scope로 Google에 302.

### PHASE 09 — 현재
사용자가 `seliscos@gmail.com`으로 로그인 → 기존 배치·통계가 그대로 보임을 확인.

---

## 5. 열린 결정 — OAuth 동의 화면을 공개할까

지금은 Testing 모드로 추정된다(개발자 계정만 로그인 가능). 우리가 쓰는 스코프는
비민감(openid·email·profile)이라 **어느 경로든 Google 심사는 없다.**

| | 방법 | 비고 |
|---|------|------|
| **A** (추천) | Testing 유지 + Test users 추가 | 게시 안 함. 도메인·약관 불필요. 최대 100명. 지인용으로 충분 |
| **B** | Production 게시 | 홈페이지·개인정보·약관 링크와 승인된 도메인을 비운 채로 "Publish app" 시도. 비민감 스코프라 대개 통과. 누구나 로그인 시 자기만의 빈 배치 생성 |
| **C** | 커스텀 도메인 연결 | `*.vercel.app`은 소유 증명이 안 돼 승인된 도메인에 못 넣음. 완전 공개하려면 도메인 구입 → Vercel 연결 → Search Console 증명 → 승인된 도메인 등록 |

---

## 6. 운영

### 환경변수 (Vercel Production + Preview 모두 설정됨)

| 변수 | 값 |
|------|-----|
| `DATABASE_URL` | Neon pooled 연결 문자열 |
| `AUTH_SECRET` | Auth.js 시크릿 |
| `AUTH_URL` | `https://timepart.vercel.app` (Production) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth 클라이언트 |

로컬은 `.env.local` (gitignore). `.env.local.example` 참고.

### 명령어

```bash
# 로컬 개발
npm install
npm run db:migrate                        # 스키마 (idempotent)
npm run dev                               # localhost:3000

# 기존 데이터를 특정 계정에 귀속
LEGACY_USER=me@gmail.com npm run db:migrate

# 재배포 (자동배포 미연결)
vercel --prod --yes
```

### git remote 주의

반드시 `git@github.com-joyceobro:…` 별칭 사용. 기본 `git@github.com`은 다른 계정
(House-of-Jung)으로 인증돼 거부됨. 확인: `ssh -T git@github.com-joyceobro` → `Hi joyceobro!`

---

## 7. 이어서 할 일

- [ ] **동의 화면 결정** — 위 A/B/C 중 선택하고 실행 (A면 Test users에 이메일 추가로 끝).
- [ ] **실기기 드래그 확인** — 폰에서 배치 드래그 감 확인 후 press-hold 딜레이(현재 140ms)·칩 크기 조정.
- [ ] **Vercel ↔ GitHub 자동배포** — 대시보드에서 repo 연결하면 push 시 자동 배포(선택).
- [ ] **카테고리 색 겹침** — 초록 계열 2개가 창고에서 구분이 약함. 설정에서 색 변경으로 해소 가능.

---

## 커밋 흐름

`c3c4201` 스캐폴딩 → `8e0020d` 앱 → `f06c7ba` 배치 재설계 → `4909c41` 다중 사용자
