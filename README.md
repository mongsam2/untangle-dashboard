# Tangle AI 대시보드

탱글 에이전트가 요청 하나를 처리하며 거친 단계(모델 호출·도구 호출·가드레일 검사·서버 판단)와 토큰·비용·소요시간을 살펴보는 운영 도구. 새 탱글 서버의 대시보드 조회 API(`/v2/dashboard/*`)를 읽기만 하며, 설계 정본은 `untangle-ai-v2`의 `docs/tangle/`(API 계약은 `server-contract.md` §6)이다.

- **요청 목록**: 출처(테스트·실제)·상태 6종 필터, KPI 6칸, 요청 표. 상태는 정상 · 도구 실패 · 입력 차단 · 한도 초과 · 출력 거부 · 서버 오류
- **요청 상세**: 사용자 입력 → 단계 타임라인(모델·도구·가드레일 차단봉·서버 판단) → 최종 응답(답변·질문·제안 카드·오늘 브리핑·오류), 토큰 구성과 모델 호출별 토큰 표
- **대화**: 같은 세션의 턴을 오래된 순으로 묶어 보고, 턴마다 입력 → 단계 → 응답을 쌓으며 그 턴까지의 누적 호출·토큰·비용을 붙임
- **케이스**: 테스트 케이스별 평균 수치와 실행 목록
- **집계**: 도구 호출 도넛(조회·제안·브리핑)과 실패율, 가드레일 층별 검사·차단, 요청당 토큰 밀도 곡선, 상태 비율, 케이스 표
- **재생**: 폰 화면에 사용자 입력 → ··· → 최종 응답을 박자에 맞춰 다시 보여주고, 오른쪽에 단계 카드를 쌓음. 대화 재생은 턴을 이어 가며 누적 수치를 계속 더함
- **구조**: 사방으로 움직이는 캔버스에 요청→응답 U자 흐름, 도구 선반 12개, 가드레일 차단봉, 동기화 레인을 펼치고, 요소를 누르면 설계 문서에서 추린 설명 창이 열림

## 빠른 시작: dev 기록 보기

내 컴퓨터에 대시보드를 띄워 dev 탱글 서버의 실행 기록을 본다. 백엔드 운영자 API가 중계하므로 터널·AWS 자격 증명은 필요 없다.

### 필요한 것

- **Bun 1.4 이상**: `curl -fsSL https://bun.sh/install | bash`로 설치, `bun upgrade`로 업데이트. `bun.lock`이 v2 형식이라 1.3.x는 잠금 파일을 무시하고 고쳐 쓰므로, 바뀐 `bun.lock`은 커밋하지 않는다
- **백엔드 운영자 키(dev)**: 담당자에게 1:1 메시지로 받는다. 채널 공지로 돌리지 않는다

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

3. **`.env` 작성**: 예시 파일을 복사하고 `ADMIN_KEY`만 채운다

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

- **링크 공유**: 필터와 열린 패널(`run`·`session`·`case`·`replay`)이 URL에 담긴다. 같은 dev 기록을 보는 팀원에게 주소를 그대로 보내면 같은 화면이 열린다
- **예시 데이터로 먼저 보기**: `.env` 없이 `bun run dev`를 실행하면 서버 없이 내장 예시 데이터(아래 mock)로 모든 화면이 열린다. 전역 메뉴 오른쪽에 "예시 데이터"가 보인다

### 키 다루기

- **프록시에서만 사용**: `ADMIN_KEY`는 개발 서버 프록시(`vite.config.ts`)가 `X-Admin-Key` 헤더로 붙일 때만 쓴다. `VITE_` 접두사가 없어 브라우저 코드로 나가지 않는다
- **`.env`는 커밋 금지**: `.gitignore`에 들어 있다. 키를 채널·이슈·스크린샷에 올리지 않는다

### 자주 나는 오류

화면에 "요청 목록을 불러오지 못했어요"가 뜨면 브라우저 개발자 도구 Network 탭에서 `/v2/dashboard/runs` 요청의 상태 코드부터 확인한다.

| 증상 | 원인 | 해결 |
|---|---|---|
| 404 | `ADMIN_KEY`가 비었거나 틀림 | 전달받은 키를 다시 붙여 넣고(앞뒤 공백·따옴표 확인) 개발 서버 재시작 |
| 503 | 백엔드에 탱글 대시보드 토큰이 없거나 백엔드가 탱글에 연결하지 못함 | 내 설정 문제가 아니다. 백엔드 담당자에게 알린다 |
| 500, 터미널에 `http proxy error` | `ADMIN_API_URL` 오타나 네트워크 문제로 백엔드에 닿지 못함 | 주소를 `https://dev-api.gbstudio.kr`로 맞춘다 |
| 오류 없이 예시 데이터만 보임(Network 탭에 `/v2/dashboard` 요청 없음) | mock 모드. `VITE_API_MODE`가 `live`가 아님(오타, 주석 처리, `.env` 누락) | `.env`의 `VITE_API_MODE=live` 확인 후 개발 서버 재시작 |
| `.env`를 고쳐도 그대로 | 개발 서버는 시작할 때만 `.env`를 읽음 | 터미널에서 `Ctrl+C` 후 `bun run dev` 다시 실행 |

## 개발자용

### 명령

| 명령 | 내용 |
|---|---|
| `bun run dev` | 개발 서버(http://localhost:5173) |
| `bun run build` | 타입 검사(`tsc -b`) 후 `dist/`에 빌드 |
| `bun run preview` | `dist/`를 http://0.0.0.0:4173 에서 띄운다. 개발 서버와 같은 프록시가 붙어 live 모드가 그대로 동작한다 |
| `bun run typecheck` | 타입 검사만 |
| `bun run test` | Vitest 단위 테스트(`src/**/*.test.ts`) |

### 연결 방식과 환경 변수

`VITE_API_MODE`와 `ADMIN_API_URL`로 연결 방식이 정해진다. 화면과 조회 훅은 모든 방식에서 같고 `src/api/client.ts`(mock/live 분기)와 `vite.config.ts`(프록시)만 갈린다.

| 방식 | 조건 | 동작 |
|---|---|---|
| mock | `VITE_API_MODE`가 `live`가 아님 | 서버 없이 `src/api/mock/`의 예시 데이터로 응답 |
| 백엔드 경유 | `live` + `ADMIN_API_URL` 있음 | 프록시가 `/v2/dashboard/*`를 `{ADMIN_API_URL}/api/v1/admin/tangle/dashboard/*`로 바꾸고 `X-Admin-Key` 헤더를 붙인다 |
| 탱글 직접 | `live` + `ADMIN_API_URL` 없음 | 프록시가 `/v2/*`를 `TANGLE_SERVER_URL`로 넘기고 `Authorization: Bearer …` 헤더를 붙인다 |

| 변수 | 기본값 | 의미 |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock` 또는 `live` |
| `ADMIN_API_URL` | 없음 | 있으면 백엔드 경유. 백엔드 주소(예: `https://dev-api.gbstudio.kr`) |
| `ADMIN_KEY` | 없음 | 백엔드 운영자 키(SSM `/untangle/{env}/ADMIN_KEY`). 프록시가 `X-Admin-Key` 헤더로 붙인다 |
| `TANGLE_SERVER_URL` | `http://127.0.0.1:8010` | 백엔드 경유가 아닐 때 `/v2`를 넘길 탱글 서버 주소 |
| `TANGLE_DASHBOARD_TOKEN` | 없음 | 탱글 서버의 같은 이름 설정값. 프록시가 `Authorization: Bearer …` 헤더로 붙인다 |

- **백엔드 경유**: dev·prod 탱글 서버는 내부망에만 있어 직접 붙지 못한다. 백엔드(`untangle_server`)의 운영자 API `/api/v1/admin/tangle/dashboard/{runs, runs/{turn_id}, sessions, sessions/{session_id}, cases/{test_case_id}, stats}`가 탱글 대시보드 토큰을 붙여 `/v2/dashboard/*`로 중계한다
- **토큰도 프록시에서만**: `TANGLE_DASHBOARD_TOKEN`도 `ADMIN_KEY`처럼 프록시에서만 헤더로 붙인다. 그래서 live 모드는 프록시가 있는 `bun run dev`나 `bun run preview`로 띄운다. `dist/` 정적 파일만 다른 웹 서버에 올리면 프록시가 없어 데이터를 읽지 못한다

### 배포

서버 한 대에 bun만 있으면 된다. 저장소를 받고 `.env`에 `VITE_API_MODE=live`·`ADMIN_API_URL`·`ADMIN_KEY`를 채운 뒤 아래를 실행하면 4173 포트에서 운영자 API를 거쳐 dev·prod 탱글 기록을 읽는다.

```bash
bun install --frozen-lockfile
bun run build
bun run preview
```

- **prod 기록**: `ADMIN_API_URL`을 prod 백엔드 주소로, `ADMIN_KEY`를 prod 운영자 키(SSM `/untangle/prod/ADMIN_KEY`)로 바꾼다. 백엔드의 `/api/v1/admin/tangle/dashboard/*` 중계와 탱글의 `TANGLE_DASHBOARD_TOKEN`이 그 환경에 설정돼 있어야 한다
- **키 보호**: `ADMIN_KEY`는 프록시가 서버 쪽에서만 붙이므로 브라우저에 노출되지 않지만, 대시보드 자체에는 로그인이 없다. 포트는 팀 내부망·VPN에서만 열고 공개 인터넷에 두지 않는다
- **정적 호스팅은 안 됨**: `dist/`만 S3·Pages 같은 곳에 올리면 프록시가 없어 `/v2/dashboard/*` 호출이 실패한다. 꼭 정적으로 두려면 같은 도메인의 리버스 프록시(nginx 등)가 `/v2/dashboard/*`를 `{ADMIN_API_URL}/api/v1/admin/tangle/dashboard/*`로 바꾸고 `X-Admin-Key`를 붙여야 한다

### API 계약과 타입

- **정본**: `untangle-ai-v2/docs/tangle/server-contract.md` §6. 식별자는 `session_id`·`turn_id`(요청 1건)·`test_case_id`, 단계 종류는 `model`·`tool`·`guardrail`·`server`, 도구 종류는 `query`·`proposal`·`briefing`, 실행 상태는 6종
- **타입 파일**: `src/api/types.ts`에 계약을 손으로 옮겼다. 새 서버가 OpenAPI 문서를 내면 `openapi-typescript` 생성물로 바꿔도 되지만, 그때까지는 계약이 바뀔 때 이 파일과 mock을 같이 고친다
- **서버가 바꾸는 기록**: 모델이 답변 말풍선과 제안 안내를 모두 비우면 서버가 기본 문장("하나만 물어볼게."·"몇 가지만 물어볼게."·"이렇게 바꿔보는 건 어때?"·추가 카드만 있으면 "추가해뒀어. 필요 없으면 되돌려도 돼."·"오늘 할 일을 정리해봤어.")을 채워 저장하므로 기록의 `answer`가 모델 원문이 아닐 수 있다. 상세·재생 화면은 그 경우 말풍선 옆에 "서버 기본 문구" 꼬리표를 단다(`src/lib/response.ts`). 질문 문구 200자·선택지 40자(UTF-16) 초과는 출력 검증에서 `question_length`·`option_length`로 거절돼 `correction_requested` 뒤 재시도되고, 새 할 일·계획 생성 도구의 `estimated_minutes`는 필수라 빠뜨리면 `INVALID_ARGUMENT` 도구 실패 단계가 하나 더 남는다
- **mock**: 예시 데이터 61건(설계 문서의 검증 사례 18종 × 3회 + 실제 요청 4세션 7턴, 그중 끝나지 않은 요청 1건)으로 여섯 조회 API를 흉내 낸다. 필터·커서 페이지·요약·집계를 서버와 같은 규칙으로 계산한다(평균·합계에서 null 제외, 범위를 벗어난 `limit`·조건이 다른 커서는 422, 없는 대상은 404). 케이스 번호와 제목은 `src/lib/cases.ts`, 시나리오는 `src/api/mock/fixtures.ts`

### 화면 규칙

- **디자인 토큰**: 피그마 "Dashboard v2 · Design System"의 변수를 `src/styles/tokens.css`에 그대로 옮겼다. 컴포넌트 CSS는 변수만 쓴다. 화면 정본은 같은 파일의 "Dashboard v2 · Screens"
- **상태 색**: 정상은 행을 칠하지 않고 문제가 있는 상태만 연하게 칠한다. 서버 오류는 어두운 배지
- **가드레일**: 단계 타임라인·집계·구조도 모두 같은 줄무늬 차단봉(`.stripes`)으로 그린다. 통과는 회색 점, 차단은 빨간 배지
- **도구 색**: 조회 = 파랑, 제안 = 주황, 브리핑 = 초록. 램프(`--ramp-*`)는 호출 많은 순
- **시각**: 모두 한국 시간(UTC+9). 계획의 날짜·시각은 기기 시간대 값이라 변환하지 않고 적힌 그대로 보인다
- **ID**: UUID는 앞 8자리만 보이고 누르면 전체 값이 복사된다
