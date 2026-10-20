# Tangle AI 대시보드

탱글 에이전트가 요청 하나를 처리하며 거친 단계(모델 호출·도구 호출·서버 판단)와 토큰·비용·소요시간을 살펴보는 로컬 전용 도구. 탱글의 대시보드 조회 API(`/v1/dashboard/*`)를 읽기만 함.

- **요청 목록**: KPI, 출처·처리 경로·상태 필터, 요청 표
- **요청 인스펙터**: 단계 타임라인, 토큰 구성, 최종 응답(제안서 카드, 실행 결과, 사용자 변경 결과, 노트 상태, 오류)과 서버가 구성한 이전 대화, 모델 호출별 토큰 표
- **케이스 인스펙터**: 테스트 케이스별 평균 수치와 실행 목록
- **집계**: 도구 호출 도넛·실패율, 요청당 토큰 밀도 곡선, 처리 경로·상태 비율, 케이스 표
- **재생**: 이전 대화 → 사용자 입력 → 단계 → 최종 응답을 박자에 맞춰 다시 보여줌

## 빠른 시작: dev 기록 보기

내 컴퓨터에 대시보드를 띄워 dev 탱글 서버의 실행 기록을 봄. 백엔드 운영자 API가 중계하므로 터널·AWS 자격 증명 불필요.

### 필요한 것

- **Bun 1.4 이상 권장**: `curl -fsSL https://bun.sh/install | bash`로 설치, `bun upgrade`로 업데이트. `bun.lock`이 v2 형식이라 1.3.x(1.3.14에서 확인)는 잠금 파일을 무시하고 `bun.lock`을 고쳐 씀. 그래도 실행은 되지만 바뀐 `bun.lock`은 커밋하지 않음
- **백엔드 운영자 키(dev)**: 담당자에게 1:1 메시지로 받음. 채널 공지로 돌리지 않음

### 실행

1. **저장소 받기**

   ```sh
   git clone https://github.com/mongsam2/untangle-dashboard.git
   cd untangle-dashboard
   ```

2. **의존성 설치**

   ```sh
   bun install
   ```

3. **`.env` 작성**: 예시 파일을 복사하고 `ADMIN_KEY`만 채움. 나머지 두 줄은 예시 파일에 이미 있음

   ```sh
   cp .env.example .env
   ```

   ```dotenv
   VITE_API_MODE=live
   ADMIN_API_URL=https://dev-api.gbstudio.kr
   ADMIN_KEY=<전달받은 키>
   ```

4. **개발 서버 실행**

   ```sh
   bun run dev
   ```

5. **브라우저로 열기**: http://localhost:5173. 요청 목록에 dev 실행 기록이 뜨면 성공

- **링크 공유**: 필터와 열린 패널이 URL에 담김. 같은 dev 기록을 보는 팀원에게 주소를 그대로 보내면 같은 화면이 열림

### 키 다루기

- **프록시에서만 사용**: `ADMIN_KEY`는 개발 서버 프록시(`vite.config.ts`)가 `X-Admin-Key` 헤더로 붙일 때만 씀. `VITE_` 접두사가 없어 브라우저 코드로 나가지 않음
- **`.env`는 커밋 금지**: `.gitignore`에 들어 있음. 키를 채널·이슈·스크린샷에 올리지 않음

### 자주 나는 오류

화면에 "요청 목록을 불러오지 못했어요"가 뜨면 브라우저 개발자 도구 Network 탭에서 `/v1/dashboard/runs` 요청의 상태 코드부터 확인.

| 증상 | 원인 | 해결 |
|---|---|---|
| 404 | `ADMIN_KEY`가 비었거나 틀림 | 전달받은 키를 다시 붙여 넣음(앞뒤 공백·따옴표 확인) 후 개발 서버 재시작 |
| 503 | 백엔드에 탱글 대시보드 토큰이 없거나 백엔드가 탱글에 연결하지 못함 | 내 설정 문제 아님. 백엔드 담당자에게 알림 |
| 500, 터미널에 `http proxy error` | `ADMIN_API_URL` 오타나 네트워크 문제로 백엔드에 닿지 못함 | 주소를 `https://dev-api.gbstudio.kr`로 맞춤 |
| 오류 없이 예시 데이터만 보임(Network 탭에 `/v1/dashboard` 요청 없음) | mock 모드. `VITE_API_MODE`가 `live`가 아님(오타, 주석 처리, `.env` 누락) | `.env`의 `VITE_API_MODE=live` 확인 후 개발 서버 재시작 |
| `.env`를 고쳐도 그대로 | 개발 서버는 시작할 때만 `.env`를 읽음 | 터미널에서 `Ctrl+C` 후 `bun run dev` 다시 실행 |

## 개발자용

로컬 탱글 서버에 직접 붙이거나 응답 타입·화면 규칙을 고칠 때 보는 내용.

### 명령

| 명령 | 내용 |
|---|---|
| `bun run dev` | 개발 서버(http://localhost:5173) |
| `bun run build` | 타입 검사(`tsc -b`) 후 `dist/`에 빌드 |
| `bun run typecheck` | 타입 검사만 |
| `bun run test` | Vitest 단위 테스트 |
| `bun run gen:api` | 서버 OpenAPI 문서에서 타입 생성 |

### 연결 방식과 환경 변수

`VITE_API_MODE`와 `ADMIN_API_URL`로 연결 방식이 정해짐. 화면과 조회 훅은 모든 방식에서 같고 `src/api/client.ts`(mock/live 분기)와 `vite.config.ts`(프록시)만 갈림.

| 방식 | 조건 | 동작 |
|---|---|---|
| mock | `VITE_API_MODE`가 `live`가 아님 | 서버 없이 `src/api/mock/`의 예시 데이터로 응답 |
| 백엔드 경유 | `live` + `ADMIN_API_URL` 있음 | 프록시가 `/v1/dashboard/*`를 `{ADMIN_API_URL}/api/v1/admin/tangle/dashboard/*`로 바꾸고 `X-Admin-Key` 헤더를 붙임 |
| 탱글 직접 | `live` + `ADMIN_API_URL` 없음 | 프록시가 `/v1/*`를 `TANGLE_SERVER_URL`로 넘기고 `Authorization: Bearer …` 헤더를 붙임 |

- **mock**: 예시 데이터 50건(테스트 케이스 11개 × 4회, 실제 요청 4건, 응답 오류 2건)으로 네 조회 API를 흉내 냄. 필터·커서 페이지·요약·집계를 서버 SQL과 같은 규칙으로 계산(평균·합계에서 null 제외, 케이스는 ID 순, `token_samples`는 모델을 부른 요청만, 범위를 벗어난 `limit`·조건이 다른 커서는 422, 없는 대상은 404)
- **백엔드 경유**: dev·prod 탱글 서버는 내부망에만 있어 직접 못 붙음. 백엔드 운영자 API(`/api/v1/admin/tangle/dashboard/*`)가 탱글 대시보드 토큰을 붙여 중계. 백엔드에 `UNTANGLE_TANGLE_DASHBOARD_TOKEN` 주입 필요. 이때 `TANGLE_SERVER_URL`·`TANGLE_DASHBOARD_TOKEN`은 안 씀
- **토큰도 프록시에서만**: `TANGLE_DASHBOARD_TOKEN`도 `ADMIN_KEY`처럼 프록시에서만 헤더로 붙임. 그래서 live 모드는 개발 서버(`bun run dev`)로 띄움. `dist/` 정적 파일만으로는 프록시가 없어 데이터를 못 읽음

| 변수 | 기본값 | 의미 |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock` 또는 `live` |
| `ADMIN_API_URL` | 없음 | 있으면 백엔드 경유. 백엔드 주소(예: `https://dev-api.gbstudio.kr`) |
| `ADMIN_KEY` | 없음 | 백엔드 운영자 키(SSM `/untangle/{env}/ADMIN_KEY`). 프록시가 `X-Admin-Key` 헤더로 붙임 |
| `TANGLE_SERVER_URL` | `http://127.0.0.1:8010` | 백엔드 경유가 아닐 때 `/v1`을 넘길 탱글 서버 주소 |
| `TANGLE_DASHBOARD_TOKEN` | 없음 | 탱글 서버의 같은 이름 설정값. 프록시가 `Authorization: Bearer …` 헤더로 붙임 |

- **기본값**: `.env`가 없을 때의 코드 기본값. `.env.example`은 빠른 시작에 맞춰 백엔드 경유(dev)로 채워 둠
- **넣는 곳**: `.env`(커밋하지 않음) 또는 셸 환경

### 로컬 탱글 서버에 직접 연결하기

탱글 서버(`untangle-ai-v2/app/tangle`)를 로컬 PostgreSQL에 붙여 띄운 뒤 대시보드를 탱글 직접 방식으로 엶. 모델 API 키 불필요. 대시보드 조회 API는 DB에 저장된 실행 기록만 읽음.

#### 1. 서버

아래 명령은 `untangle-ai-v2/app/tangle`에서 실행. Python 3.12, [uv](https://docs.astral.sh/uv/), PostgreSQL(16에서 확인) 필요.

1. **전용 DB 생성**: 기존 앱 DB와 섞지 않음

   ```sh
   # macOS(Homebrew): psql postgres, Linux: sudo -u postgres psql
   psql postgres -c "CREATE ROLE tangle_dash LOGIN PASSWORD 'tangle_dash_pw'"
   psql postgres -c "CREATE DATABASE tangle_dash OWNER tangle_dash"
   ```

2. **`.env` 작성**: `.env.example`을 `.env`로 복사하고 값을 채움. 비밀값은 각각 32자 이상의 서로 다른 값이면 됨(로컬 전용 예시)

   ```sh
   uv sync --locked
   cp .env.example .env
   ```

   ```dotenv
   TANGLE_DATABASE_URL=postgresql+psycopg://tangle_dash:tangle_dash_pw@127.0.0.1:5432/tangle_dash
   TANGLE_REQUEST_SIGNING_SECRET=local-dev-signing-secret-0123456789abcdef
   TANGLE_CURSOR_SECRET=local-dev-cursor-secret-0123456789abcdefgh
   # 실제 요청을 기록하려면 켬. 시드 데이터만 볼 때는 꺼 둬도 됨.
   TANGLE_TRACE_ENABLED=true
   # 설정해야 /v1/dashboard/* 경로가 열림. 32자 이상. 대시보드 .env에도 같은 값을 넣음.
   TANGLE_DASHBOARD_TOKEN=local-dashboard-token-0123456789abcdefghij
   ```

   나머지 항목(`TANGLE_JWT_ISSUER` 등)은 `.env.example`의 값을 그대로 둠. `TANGLE_OPENAI_API_KEY`는 비워 둬도 됨.

3. **마이그레이션·시드**: 필요하면 개발용 가짜 기록 48건(케이스 11개 × 4회 + 실제 요청 4건)을 넣음. 시드는 로컬 DB 주소에서만 실행되고 여러 번 실행해도 결과가 같음

   ```sh
   uv run --env-file .env alembic upgrade head
   uv run --env-file .env python scripts/seed_traces.py   # 선택
   ```

4. **서버 실행**: 8010 포트

   ```sh
   uv run --env-file .env uvicorn tangle_ai.main:app --host 127.0.0.1 --port 8010
   ```

   확인: `curl -H "Authorization: Bearer <토큰>" "http://127.0.0.1:8010/v1/dashboard/runs?limit=1"`이 JSON을 돌려주면 정상. 토큰이 없거나 틀리면 401, 서버에 `TANGLE_DASHBOARD_TOKEN`이 없으면 404.

#### 2. 대시보드

`.env`에서 `ADMIN_API_URL`을 지우거나 주석 처리하고 탱글 서버 값을 채움. `ADMIN_API_URL`이 남아 있으면 백엔드 경유로 붙음.

```dotenv
VITE_API_MODE=live
# ADMIN_API_URL=https://dev-api.gbstudio.kr
TANGLE_SERVER_URL=http://127.0.0.1:8010
TANGLE_DASHBOARD_TOKEN=local-dashboard-token-0123456789abcdefghij   # 서버와 같은 값
```

```sh
bun run dev   # http://localhost:5173
```

### 서버 스키마가 바뀌었을 때

응답 타입의 정본은 서버의 OpenAPI 문서. 서버의 `schemas/dashboard.py`가 바뀌면 서버를 띄운 상태에서 타입을 다시 만들고 커밋함.

```sh
bun run gen:api   # openapi-typescript http://127.0.0.1:8010/openapi.json -o src/api/schema.d.ts
bun run build && bun run test
```

서버를 띄우지 않고 OpenAPI 문서만 뽑아 타입을 만들 수도 있음. DB 불필요. `/v1/dashboard/*` 경로가 문서에 들어가도록 대시보드 토큰만 넣음. 모델은 호출하지 않음.

```sh
# untangle-ai-v2/app/tangle 에서
uv run python -c "import json; from pydantic import SecretStr; from tangle_ai.config import DashboardSettings; from tangle_ai.main import create_app; print(json.dumps(create_app(DashboardSettings(dashboard_token=SecretStr('d'*40), _env_file=None)).openapi()))" > /tmp/openapi.json
# 이 저장소에서
bunx openapi-typescript /tmp/openapi.json -o src/api/schema.d.ts
```

- **생성 파일**: `src/api/schema.d.ts`는 손으로 고치지 않음. 화면 코드는 `src/api/types.ts`의 짧은 별칭(`RunListItem`, `RunSummaryStats` 등)을 씀
- **mock 맞추기**: 필드가 늘면 mock(`src/api/mock/aggregate.ts`·`fixtures.ts`)도 같은 값을 채우도록 맞춤. 타입 검사가 빠진 필드를 알려 줌

### 응답과 이전 대화를 읽는 규칙

최종 응답과 이전 대화는 아래 규칙으로 읽음. 순수 함수는 `lib/history.ts`와 `features/run-detail/reply/responseModel.ts`에 있고 옆의 `*.test.ts`가 검증함.

| 대상 | 규칙 |
|---|---|
| 응답 종류 | `ChatResponse`도 답변이 실패하면 `error`를 담고(`error: null`도 늘 실려 옴), `ErrorResponse`는 `message`가 없음. 그래서 `error` 키가 아니라 `message` 유무로 가름(`isErrorResponse`). 확인된 실행 결과가 있는데 답변만 실패하면 `ChatResponse`로 나가고, 말풍선은 `message`(오류 문구와 같음), 아래 실행 결과·사용자 변경·노트 상태는 그대로 보여줌. |
| `mutation_results` | 사용자 변경의 처리 결과. 상태별 건수(반영 → 거절 순)를 배지로 세고, 거절은 `error`의 코드와 이유를 줄로 보여줌. |
| `note_states` | 응답이 돌려준 목표의 최신 상태. 목표 제목, 목표 버전(`rev`), 과제 수(삭제 표식이 붙은 과제는 따로)를 보여줌. |
| 이전 대화 | 요청이 보낸 값이 아니라 서버가 같은 대화의 앞선 30턴으로 다시 만든 값. 사용자 발화 앞에 `[YYYY-MM-DD] `가 붙고, 제안 버튼 턴은 `[제안 수락: 제목]`·`[제안 거절: 제목]`으로 적히며, 끝나지 않은 턴은 사용자 발화만 남음. 인스펙터는 날짜를 따로 떼어 보이고 응답 없이 끝난 턴을 표시함. 재생 화면의 앱 대화창은 날짜를 구분선으로, 버튼 턴을 누른 버튼 말풍선으로 풀어서 보여줌. |
| 도구 이름 | `set_goal_reminder`·`clear_goal_reminder`는 `set_schedule`·`set_reminder`로 바뀜(도구는 계속 11개). 예전 실행 기록에는 옛 이름이 남아 있어 표기 순서(`lib/kinds.ts`)에 둘 다 둠. 조회·변경 구분은 기록의 `tool_kind`를 따름. |

### 숫자의 출처

KPI·케이스 표의 합계·평균·최대값은 모두 서버가 SQL로 계산한 값을 그대로 씀. 대시보드는 목록을 끝까지 받아 다시 세지 않음.

| 화면 | 쓰는 필드 |
|---|---|
| 요청 목록 KPI | `RunSummaryStats`의 `runs`·`model_runs`, `avg_total_tokens`·`total_tokens`, `total_cost_usd`·`avg_cost_usd`, `tool_failed_runs`, `outcome_unknown_runs` |
| 집계 KPI | `avg_model_calls`·`total_model_calls`, `avg_tool_calls`·`total_tool_calls`, `total_cached_tokens` ÷ `total_input_tokens`(캐시 적중률), `avg_duration_ms`·`max_duration_ms` |
| 케이스 표·케이스 인스펙터 | `CaseStat`(케이스의 전체 실행 기준 평균, `avg_model_calls` 포함) |

### 화면 상태와 URL

필터와 열린 패널은 모두 URL 검색어에 있어 새로고침해도 같은 화면이 열림.

| 검색어 | 의미 |
|---|---|
| `source`, `path`, `status` | 필터(API와 같은 값) |
| `run=<request_id>` | 요청 인스펙터 |
| `from=<test_case_id>` | 케이스 실행 목록으로 돌아가는 링크 |
| `case=<test_case_id>` | 케이스 인스펙터 |
| `replay=1` | 재생 화면 |

### 폴더 구조

```
src/
  main.tsx
  app/            App·라우트(/runs, /stats)·AppShell(전역 메뉴, 하위 메뉴, 오른쪽 상세 패널)·URL 화면 상태
  styles/         tokens.css(색·반경·글꼴 변수), base.css
  api/            schema.d.ts(생성된 응답 타입), types.ts(생성 타입의 별칭), client.ts(mock/live 분기), queries.ts(TanStack Query 훅), mock/(예시 데이터·핸들러·집계)
  lib/            format(숫자·시각), kinds(단계·도구 종류와 색), status(상태·사용자 변경 결과 표기), cases(케이스 제목), input, history(서버가 만든 이전 대화 해석)
  components/     Badge, Button, Segmented, Collapsible, Inspector, JsonView 등 공통 UI
  features/
    runs/         요청 목록: KPI 띠, 필터 패널, 요청 표, 필터 파싱
    run-detail/   요청 인스펙터: 단계 카드, 토큰 막대·표, 사용자 입력, 최종 응답·제안서 카드
    cases/        케이스 인스펙터
    stats/        집계: 도넛, 도구 표, 토큰 밀도(KDE), 비율 막대, 케이스 표
    replay/       재생: 대화창, 단계 흐름, 조작 막대, 박자 예약
```

- **순수 계산 분리**: 포맷, KDE, 집계, 재생 박자, 필터 파싱, 제안서 카드는 컴포넌트 밖 함수로 두고 옆의 `*.test.ts`에서 검증
- **스타일**: 컴포넌트 옆 `*.module.css`에 두고 색·반경은 `tokens.css` 변수만 씀
- **차트**: 라이브러리 없이 SVG와 CSS로 그림
