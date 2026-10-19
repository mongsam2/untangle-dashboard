# Tangle AI 대시보드

탱글 에이전트가 요청 하나를 처리하면서 거친 단계(모델 호출·도구 호출·서버 판단)와 토큰·비용·소요시간을 살펴보는 로컬 전용 도구다. 탱글 서버의 대시보드 조회 API(`/v1/dashboard/*`)를 읽기만 한다.

- **요청 목록**: KPI, 출처·처리 경로·상태 필터, 요청 표
- **요청 인스펙터**: 단계 타임라인, 토큰 구성, 최종 응답과 제안서 카드, 모델 호출별 토큰 표
- **케이스 인스펙터**: 테스트 케이스별 평균 수치와 실행 목록
- **집계**: 도구 호출 도넛·실패율, 요청당 토큰 밀도 곡선, 처리 경로·상태 비율, 케이스 표
- **재생**: 이전 대화 → 사용자 입력 → 단계 → 최종 응답을 박자에 맞춰 다시 보여준다

## 요구 사항

- [Bun](https://bun.sh) 1.2 이상(텍스트 잠금 파일 `bun.lock`)

## 실행

```sh
bun install
bun run dev        # http://localhost:5173
```

| 명령 | 내용 |
|---|---|
| `bun run dev` | 개발 서버 |
| `bun run build` | 타입 검사(`tsc -b`) 후 `dist/`에 빌드 |
| `bun run test` | Vitest 단위 테스트 |
| `bun run gen:api` | 서버 OpenAPI 문서에서 타입 생성 |

## 데이터 출처: mock과 live

`VITE_API_MODE`로 고른다. 화면과 조회 훅은 두 모드에서 똑같고, `src/api/client.ts`만 갈린다.

- **mock**(기본): `src/api/mock/`의 예시 데이터 50건(테스트 케이스 11개 × 4회, 실제 요청 4건, 응답 오류 2건)으로 네 조회 API를 흉내 낸다. 필터·커서 페이지·요약·집계를 서버 SQL과 같은 규칙으로 계산한다(평균·합계에서 null 제외, 케이스는 ID 순, `token_samples`는 모델을 부른 요청만, 범위를 벗어난 `limit`·조건이 다른 커서는 422, 없는 대상은 404). 서버 없이 바로 쓸 수 있다.
- **live**: 개발 서버가 `/v1` 요청을 탱글 서버로 프록시한다. 아래 "실제 API로 실행하기"를 따른다.

## 실제 API로 실행하기

탱글 서버(`untangle-ai-v2/app/tangle`)를 로컬 PostgreSQL에 붙여 띄운 뒤, 대시보드를 live 모드로 연다. 모델 API 키는 필요 없다. 대시보드 조회 API는 DB에 저장된 실행 기록만 읽는다.

### 1. 서버

아래 명령은 `untangle-ai-v2/app/tangle`에서 실행한다. Python 3.12, [uv](https://docs.astral.sh/uv/), PostgreSQL(16에서 확인)이 필요하다.

1. 전용 DB를 만든다. 기존 앱 DB와 섞지 않는다.

   ```sh
   # macOS(Homebrew): psql postgres, Linux: sudo -u postgres psql
   psql postgres -c "CREATE ROLE tangle_dash LOGIN PASSWORD 'tangle_dash_pw'"
   psql postgres -c "CREATE DATABASE tangle_dash OWNER tangle_dash"
   ```

2. `.env.example`을 `.env`로 복사하고 값을 채운다. 비밀값은 각각 32자 이상의 서로 다른 값이면 된다(로컬 전용 예시).

   ```sh
   uv sync --locked
   cp .env.example .env
   ```

   ```dotenv
   TANGLE_DATABASE_URL=postgresql+psycopg://tangle_dash:tangle_dash_pw@127.0.0.1:5432/tangle_dash
   TANGLE_REQUEST_SIGNING_SECRET=local-dev-signing-secret-0123456789abcdef
   TANGLE_CURSOR_SECRET=local-dev-cursor-secret-0123456789abcdefgh
   # 실제 요청을 기록하려면 켠다. 시드 데이터만 볼 때는 꺼 둬도 된다.
   TANGLE_TRACE_ENABLED=true
   # 설정해야 /v1/dashboard/* 경로가 열린다. 32자 이상. 대시보드 .env에도 같은 값을 넣는다.
   TANGLE_DASHBOARD_TOKEN=local-dashboard-token-0123456789abcdefghij
   ```

   나머지 항목(`TANGLE_JWT_ISSUER` 등)은 `.env.example`의 값을 그대로 둔다. `TANGLE_OPENAI_API_KEY`는 비워 둬도 된다.

3. 마이그레이션하고, 필요하면 개발용 가짜 기록 48건(케이스 11개 × 4회 + 실제 요청 4건)을 넣는다. 시드는 로컬 DB 주소에서만 실행되고, 여러 번 실행해도 같은 결과다.

   ```sh
   uv run --env-file .env alembic upgrade head
   uv run --env-file .env python scripts/seed_traces.py   # 선택
   ```

4. 8010 포트로 서버를 띄운다.

   ```sh
   uv run --env-file .env uvicorn tangle_ai.main:app --host 127.0.0.1 --port 8010
   ```

   확인: `curl -H "Authorization: Bearer <토큰>" "http://127.0.0.1:8010/v1/dashboard/runs?limit=1"`이 JSON을 돌려주면 된다. 토큰이 없거나 틀리면 401, 서버에 `TANGLE_DASHBOARD_TOKEN`이 없으면 404다.

### 2. 대시보드

```sh
cp .env.example .env
```

```dotenv
VITE_API_MODE=live
TANGLE_SERVER_URL=http://127.0.0.1:8010
TANGLE_DASHBOARD_TOKEN=local-dashboard-token-0123456789abcdefghij   # 서버와 같은 값
```

```sh
bun run dev   # http://localhost:5173
```

토큰은 `vite.config.ts`의 프록시에서만 `Authorization: Bearer …` 헤더로 붙이고 브라우저 코드로는 내보내지 않는다(`VITE_` 접두사가 없는 변수는 번들에 들어가지 않는다). 그래서 live 모드는 `bun run dev`에서만 동작한다. `.env`를 바꾸면 개발 서버를 다시 시작한다.

### 3. 서버 스키마가 바뀌었을 때

응답 타입의 정본은 서버의 OpenAPI 문서다. 서버의 `schemas/dashboard.py`가 바뀌면 서버를 띄운 상태에서 타입을 다시 만들고 커밋한다.

```sh
bun run gen:api   # openapi-typescript http://127.0.0.1:8010/openapi.json -o src/api/schema.d.ts
bun run build && bun run test
```

`src/api/schema.d.ts`는 생성 파일이라 손으로 고치지 않는다. 화면 코드는 `src/api/types.ts`의 짧은 별칭(`RunListItem`, `RunSummaryStats` 등)을 쓴다. 필드가 늘면 mock(`src/api/mock/aggregate.ts`·`fixtures.ts`)도 같은 값을 채우도록 맞춘다. 타입 검사가 빠진 필드를 알려 준다.

## 환경 변수

`.env`(커밋하지 않음) 또는 셸 환경으로 넣는다.

| 변수 | 기본값 | 의미 |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock` 또는 `live` |
| `TANGLE_SERVER_URL` | `http://127.0.0.1:8010` | live 모드에서 `/v1`을 넘길 탱글 서버 주소 |
| `TANGLE_DASHBOARD_TOKEN` | 없음 | 서버의 같은 이름 설정값. 개발 서버 프록시가 `Authorization: Bearer …` 헤더로 붙인다 |

## 숫자의 출처

KPI·케이스 표의 합계·평균·최대값은 모두 서버가 SQL로 계산한 값을 그대로 쓴다. 대시보드는 목록을 끝까지 받아 다시 세지 않는다.

| 화면 | 쓰는 필드 |
|---|---|
| 요청 목록 KPI | `RunSummaryStats`의 `runs`·`model_runs`, `avg_total_tokens`·`total_tokens`, `total_cost_usd`·`avg_cost_usd`, `tool_failed_runs`, `outcome_unknown_runs` |
| 집계 KPI | `avg_model_calls`·`total_model_calls`, `avg_tool_calls`·`total_tool_calls`, `total_cached_tokens` ÷ `total_input_tokens`(캐시 적중률), `avg_duration_ms`·`max_duration_ms` |
| 케이스 표·케이스 인스펙터 | `CaseStat`(케이스의 전체 실행 기준 평균, `avg_model_calls` 포함) |

## 화면 상태와 URL

필터와 열린 패널은 모두 URL 검색어에 있어서 새로고침해도 같은 화면이 열린다.

| 검색어 | 의미 |
|---|---|
| `source`, `path`, `status` | 필터(API와 같은 값) |
| `run=<request_id>` | 요청 인스펙터 |
| `from=<test_case_id>` | 케이스 실행 목록으로 돌아가는 링크 |
| `case=<test_case_id>` | 케이스 인스펙터 |
| `replay=1` | 재생 화면 |

## 폴더 구조

```
src/
  main.tsx
  app/            App·라우트(/runs, /stats)·AppShell(전역 메뉴, 하위 메뉴, 오른쪽 상세 패널)·URL 화면 상태
  styles/         tokens.css(색·반경·글꼴 변수), base.css
  api/            schema.d.ts(생성된 응답 타입), types.ts(생성 타입의 별칭), client.ts(mock/live 분기), queries.ts(TanStack Query 훅), mock/(예시 데이터·핸들러·집계)
  lib/            format(숫자·시각), kinds(단계·도구 종류와 색), status(상태 표기), cases(케이스 제목), input
  components/     Badge, Button, Segmented, Collapsible, Inspector, JsonView 등 공통 UI
  features/
    runs/         요청 목록: KPI 띠, 필터 패널, 요청 표, 필터 파싱
    run-detail/   요청 인스펙터: 단계 카드, 토큰 막대·표, 사용자 입력, 최종 응답·제안서 카드
    cases/        케이스 인스펙터
    stats/        집계: 도넛, 도구 표, 토큰 밀도(KDE), 비율 막대, 케이스 표
    replay/       재생: 대화창, 단계 흐름, 조작 막대, 박자 예약
```

순수 계산(포맷, KDE, 집계, 재생 박자, 필터 파싱, 제안서 카드)은 컴포넌트 밖 함수로 두고 옆의 `*.test.ts`에서 검증한다. 스타일은 컴포넌트 옆 `*.module.css`에 두고 색·반경은 `tokens.css` 변수만 쓴다. 차트는 라이브러리 없이 SVG와 CSS로 그린다.
