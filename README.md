# Tangle AI 대시보드

탱글 에이전트가 요청 하나를 처리하며 거친 단계(모델 호출·도구 호출·가드레일 검사·서버 판단)와 토큰·비용·소요시간을 살펴보는 운영 도구. 새 탱글 서버의 대시보드 API(`/v2/dashboard/*`)를 읽고, 테스트 실행만 시작·중단하며, 설계 정본은 `untangle-ai-v2`의 `docs/tangle/`(API 계약은 `server-contract.md` §6)이다.

- **요청 목록**: 출처(테스트·실제)·상태 6종 필터, KPI 6칸, 요청 표. 상태는 정상 · 도구 실패 · 입력 차단 · 한도 초과 · 출력 거부 · 서버 오류
- **요청 상세**: 사용자 입력 → 단계 타임라인(모델·도구·가드레일 차단봉·서버 판단) → 최종 응답(답변·질문·제안 카드·오늘 브리핑·오류), 토큰 구성과 모델 호출별 토큰 표
- **대화**: 같은 세션의 턴을 오래된 순으로 묶어 보고, 턴마다 입력 → 단계 → 응답을 쌓으며 그 턴까지의 누적 호출·토큰·비용을 붙임
- **케이스**: 테스트 케이스별 평균 수치와 실행 목록
- **집계**: 도구 호출 도넛(조회·제안·브리핑)과 실패율, 가드레일 층별 검사·차단, 요청당 토큰 밀도 곡선, 상태 비율, 케이스 표
- **테스트**: 탱글의 모델·추론 강도 비교 테스트. 테스트 셋(요약 카드·카테고리별 케이스 수·케이스 표)과 실행 결과(진행 상황·방금 끝난 시도, 끝나면 설정별 요약·카테고리별 통과율·자주 틀린 체크 항목, 카테고리 값을 누르면 케이스별 결과), 새 실행 팝업. 비교 설정은 한 실행에 최대 2개(A·B)다. 케이스는 테스트 셋 설계 문서의 케이스 84개를 옮긴 케이스 파일(`src/features/tests/testSet.json`)이고, 시작 목록·기억·이전 대화도 이 파일에 함께 둔다. 실행 시작 때 이 파일을 함께 보내면 고른 서버의 탱글 서버가 뒤에서 시도를 돌리고 채점한다. 화면은 진행 중인 실행을 3초마다 다시 읽는다. 체크 항목은 코드로 판정할 수 있는 것을 먼저 보고, 나머지와 품질 점수는 채점 모델이 매긴다. 체크 줄 오른쪽에는 실제로 판정한 쪽이 보인다. 새 실행의 예상 비용·시간은 같은 설정이 든 지난 실행의 기록으로 어림하고, 기록이 없으면 비워 둔다. 운영 서버에서는 실행하지 않는다. mock 모드는 예시 실행(`src/features/tests/sampleData.ts`)을 보인다
- **재생**: 폰 화면에 사용자 입력 → ··· → 최종 응답을 박자에 맞춰 다시 보여주고, 오른쪽에 단계 카드를 쌓음. 대화 재생은 턴을 이어 가며 누적 수치를 계속 더함. 요청 재생은 2배속, 대화 재생은 1배속으로 시작하고 재생 중에 1·2·4·8배속으로 바꾼다

## 빠른 시작: dev 기록 보기

내 컴퓨터에 대시보드를 띄워 dev 탱글 서버의 실행 기록을 본다. 백엔드 운영자 API가 중계하므로 터널·AWS 자격 증명은 필요 없다. 운영 서버도 설정하면 화면 위 버튼으로 개발·운영을 오가며 본다.

### 필요한 것

- **Bun 1.4 이상**: `curl -fsSL https://bun.sh/install | bash`로 설치, `bun upgrade`로 업데이트. `bun.lock`이 v2 형식이라 1.3.x는 잠금 파일을 무시하고 고쳐 쓰므로, 바뀐 `bun.lock`은 커밋하지 않는다
- **백엔드 운영자 키(dev)**: 담당자에게 1:1 메시지로 받는다. 채널 공지로 돌리지 않는다
- **대시보드 접근 키**: 팀이 정한 우리만의 키. 대시보드에 들어올 때 입력한다. 내 컴퓨터에서만 쓸 거면 16자 이상으로 아무 값이나 정해도 된다

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

3. **`.env` 작성**: 예시 파일을 복사하고 `DASHBOARD_ACCESS_KEY`·`DEV_ADMIN_KEY`를 채운다

   ```sh
   cp .env.example .env
   ```

   ```dotenv
   VITE_API_MODE=live
   DASHBOARD_ACCESS_KEY=<접근 키>
   DEV_ADMIN_API_URL=https://dev-api.gbstudio.kr
   DEV_ADMIN_KEY=<전달받은 키>
   ```

4. **개발 서버 실행**

   ```sh
   bun run dev
   ```

5. **브라우저로 열기**: http://localhost:5173. 접근 키를 넣고 들어가 요청 목록에 dev 실행 기록이 뜨면 성공

- **링크 공유**: 서버(`server`)·필터·열린 패널(`run`·`session`·`case`·`replay`)과 테스트 탭 화면(`tab`·`test_run`·`test_case`·`test_filter`)이 URL에 담긴다. 같은 서버를 연결한 팀원에게 주소를 그대로 보내면 접근 키를 넣은 뒤 같은 화면이 열린다
- **예시 데이터로 먼저 보기**: `.env` 없이 `bun run dev`를 실행하면 서버 없이 내장 예시 데이터(아래 mock)로 모든 화면이 열린다. 전역 메뉴 오른쪽에 "예시 데이터"가 보인다

### 키 다루기

- **운영자 키는 서버 쪽에서만**: `DEV_ADMIN_KEY`·`PROD_ADMIN_KEY`는 대시보드의 서버 쪽 코드(`server/dashboardApi.ts`)가 백엔드로 보낼 때 `X-Admin-Key` 헤더로 붙인다. `VITE_` 접두사가 없어 브라우저 코드로 나가지 않는다
- **접근 키**: 화면에서 입력한 키는 이 탭에만 기억하고(sessionStorage) 탭을 닫으면 다시 묻는다. 메뉴 오른쪽 "잠그기"로 바로 지울 수 있다
- **`.env`는 커밋 금지**: `.gitignore`에 들어 있다. 키를 채널·이슈·스크린샷에 올리지 않는다

### 자주 나는 오류

화면에 "요청 목록을 불러오지 못했어요"가 뜨면 브라우저 개발자 도구 Network 탭에서 `/api/dashboard?…route=runs` 요청의 상태 코드부터 확인한다.

| 증상 | 원인 | 해결 |
|---|---|---|
| 접근 키 화면에 "접근 키가 맞지 않아요" | 입력한 키가 `DASHBOARD_ACCESS_KEY`와 다름 | 앞뒤 공백 없이 다시 입력한다 |
| 접근 키 화면에 "설정되지 않았어요" | `DASHBOARD_ACCESS_KEY`가 비었거나 16자보다 짧음 | `.env`에 16자 이상으로 채우고 개발 서버 재시작 |
| 개발 서버가 `ADMIN_API_URL·ADMIN_KEY는 서버별 이름으로 바뀌었다`로 멈춤 | 예전 `.env` | `DEV_ADMIN_API_URL`·`DEV_ADMIN_KEY`로 이름을 바꾼다 |
| 404, "대시보드 데이터를 찾지 못했어요" | 운영자 키가 틀렸거나, 그 서버의 백엔드에 대시보드 중계가 아직 배포되지 않음 | 키를 다시 붙여 넣고 재시작. 운영 서버라면 운영 배포 여부를 확인한다 |
| 503 | 백엔드에 탱글 대시보드 토큰이 없거나 백엔드가 탱글에 연결하지 못함 | 내 설정 문제가 아니다. 백엔드 담당자에게 알린다 |
| 502, "서버에 연결하지 못했어요" | 서버 주소 오타나 네트워크 문제로 백엔드에 닿지 못함 | 주소를 `https://dev-api.gbstudio.kr`로 맞춘다 |
| 메뉴 오른쪽에 운영 서버 버튼이 없음 | `PROD_ADMIN_API_URL`이나 `PROD_ADMIN_KEY`가 비어 있음. 터미널에 `[dashboard] PROD_ADMIN_KEY가 비어 있어` 경고가 보인다 | 운영자 키를 채우고 재시작 |
| 오류 없이 예시 데이터만 보임(접근 키 화면도 없음) | mock 모드. `VITE_API_MODE`가 `live`가 아님(오타, 주석 처리, `.env` 누락) | `.env`의 `VITE_API_MODE=live` 확인 후 개발 서버 재시작 |
| `.env`를 고쳐도 그대로 | 개발 서버는 시작할 때만 `.env`를 읽음 | 터미널에서 `Ctrl+C` 후 `bun run dev` 다시 실행 |

## 개발자용

### 명령

| 명령 | 내용 |
|---|---|
| `bun run dev` | 개발 서버(http://localhost:5173) |
| `bun run build` | 타입 검사(`tsc -b`) 후 `dist/`에 빌드 |
| `bun run preview` | `dist/`를 http://0.0.0.0:4173 에서 띄운다. 개발 서버와 같은 `/api/*`가 붙어 live 모드가 그대로 동작한다 |
| `bun run typecheck` | 타입 검사만 |
| `bun run test` | Vitest 단위 테스트(`src/**/*.test.ts`, `server/**/*.test.ts`) |

### 연결 방식과 환경 변수

브라우저는 언제나 같은 출처의 `/api/*`만 부른다. 로컬에서는 개발·미리보기 서버의 미들웨어(`vite.config.ts`)가, Vercel에서는 `api/*.ts` 함수가 받고, 둘 다 `server/dashboardApi.ts`의 같은 코드로 처리한다.

| 경로 | 동작 |
|---|---|
| `GET /api/access` | 헤더 `X-Dashboard-Key`가 `DASHBOARD_ACCESS_KEY`와 같으면 연결된 서버 목록(`dev`·`prod`·`local`)을 준다 |
| `GET /api/dashboard?server=…&route=…` | 접근 키를 확인한 뒤 고른 서버의 조회 경로(`runs`·`runs/{turn_id}`·`sessions`·`sessions/{session_id}`·`cases/{test_case_id}`·`stats`·`test-runs`·`test-runs/{run_id}`)로 나머지 검색어와 함께 넘긴다. 그 밖의 경로는 404 |
| `POST /api/dashboard?server=…&route=…` | 테스트 실행 시작(`test-runs`)과 중단(`test-runs/{run_id}/stop`)만 본문 그대로 넘긴다. 운영 서버는 403, 그 밖의 경로는 404 |

| 서버 | 켜지는 조건 | 넘기는 곳 |
|---|---|---|
| 개발 | `DEV_ADMIN_API_URL`·`DEV_ADMIN_KEY` 둘 다 있음 | `{DEV_ADMIN_API_URL}/api/v1/admin/tangle/dashboard/*`, `X-Admin-Key` 헤더 |
| 운영 | `PROD_ADMIN_API_URL`·`PROD_ADMIN_KEY` 둘 다 있음 | `{PROD_ADMIN_API_URL}/api/v1/admin/tangle/dashboard/*`, `X-Admin-Key` 헤더 |
| 로컬 | `TANGLE_SERVER_URL`이 있거나 개발·운영이 모두 꺼짐 | `{TANGLE_SERVER_URL}/v2/dashboard/*`, `Authorization: Bearer …` 헤더 |

| 변수 | 기본값 | 의미 |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock` 또는 `live`. 빌드할 때 화면 코드에 들어간다 |
| `DASHBOARD_ACCESS_KEY` | 없음 | 대시보드 접근 키. 16자 이상. 비었거나 짧으면 모든 조회를 막는다 |
| `DEV_ADMIN_API_URL`·`DEV_ADMIN_KEY` | 없음 | 개발 백엔드 주소와 운영자 키(SSM `/untangle/dev/ADMIN_KEY`) |
| `PROD_ADMIN_API_URL`·`PROD_ADMIN_KEY` | 없음 | 운영 백엔드 주소와 운영자 키(SSM `/untangle/prod/ADMIN_KEY`) |
| `TANGLE_SERVER_URL` | `http://127.0.0.1:8010` | 로컬 탱글 서버 주소 |
| `TANGLE_DASHBOARD_TOKEN` | 없음 | 탱글 서버의 같은 이름 설정값 |

- **백엔드 경유**: dev·prod 탱글 서버는 내부망에만 있어 직접 붙지 못한다. 백엔드(`untangle_server`)의 운영자 API가 탱글 대시보드 토큰을 붙여 `/v2/dashboard/*`로 중계한다
- **운영자 키가 빈 서버는 끈다**: 키 없이 보낸 요청도 백엔드는 틀린 키로 세고, 실패가 몰리면 맞는 키까지 잠시 막는다. 같은 이유로 4xx 응답은 다시 보내지 않는다
- **서버 전환**: 서버가 둘 이상 켜지면 메뉴 오른쪽에 "개발 서버 / 운영 서버" 버튼이 생긴다. 조회 캐시는 서버별로 나뉘고, 서버를 바꾸면 열린 상세 패널을 닫는다. 운영 서버를 보는 동안은 메뉴 위에 주황 띠가 보인다
- **정적 호스팅만으로는 안 됨**: `dist/`만 S3·Pages 같은 곳에 올리면 `/api/*`가 없어 데이터를 읽지 못한다. Vercel처럼 함수가 있는 곳이나 `bun run preview`로 띄운다

### 배포

#### Vercel

저장소를 Vercel 프로젝트로 가져오면 `vercel.json`대로 Vite 빌드 결과(`dist/`)와 `api/` 함수 두 개가 올라간다. 빌드 명령·출력 폴더는 Vercel의 Vite 기본값을 쓴다.

1. **프로젝트 만들기**: Vercel에서 이 저장소를 Import한다. Framework Preset은 Vite로 잡힌다
2. **환경 변수**: Settings → Environment Variables에 아래를 넣는다. 키 세 개는 Sensitive로 둔다
   - `VITE_API_MODE` = `live`
   - `DASHBOARD_ACCESS_KEY` = 팀 접근 키(16자 이상, 예: `openssl rand -base64 24`)
   - `DEV_ADMIN_API_URL` = `https://dev-api.gbstudio.kr`, `DEV_ADMIN_KEY` = dev 운영자 키
   - `PROD_ADMIN_API_URL` = `https://api.gbstudio.kr`, `PROD_ADMIN_KEY` = prod 운영자 키
3. **배포**: 환경 변수를 바꾼 뒤에는 다시 배포해야 반영된다

- **접근 키가 문**: 대시보드 주소는 공개 인터넷에 열린다. 화면과 함수 모두 접근 키가 맞아야 기록을 준다. 키를 바꾸면 이미 들어와 있던 화면도 다음 조회에서 잠금 화면으로 돌아간다
- **운영 기록이 보이는 시점**: 운영 백엔드에 대시보드 중계가 배포되고 운영 탱글 서버가 기록을 남기기 시작해야 운영 서버 화면에 기록이 뜬다. 그 전에는 "대시보드 데이터를 찾지 못했어요"(404)나 503 안내가 보인다

#### 서버 한 대

bun만 있으면 된다. 저장소를 받고 `.env`를 채운 뒤 아래를 실행하면 4173 포트에서 띄운다.

```bash
bun install --frozen-lockfile
bun run build
bun run preview
```

### API 계약과 타입

- **정본**: `untangle-ai-v2/docs/tangle/server-contract.md` §6. 식별자는 `session_id`·`turn_id`(요청 1건)·`test_case_id`, 단계 종류는 `model`·`tool`·`guardrail`·`server`, 도구 종류는 `query`·`proposal`·`briefing`, 실행 상태는 6종
- **타입 파일**: `src/api/types.ts`에 계약(테스트 실행 포함)을 손으로 옮겼다. 새 서버가 OpenAPI 문서를 내면 `openapi-typescript` 생성물로 바꿔도 되지만, 그때까지는 계약이 바뀔 때 이 파일과 mock을 같이 고친다
- **서버가 바꾸는 기록**: 탱글 응답의 말풍선은 `answer` 하나다(`ask.text`는 항상 null). 모델이 말풍선을 비우면 서버가 기본 문장("하나만 물어볼게."·"몇 가지만 물어볼게."·"이렇게 바꿔보는 건 어때?"·추가 카드만 있으면 "추가해뒀어. 필요 없으면 되돌려도 돼."·"오늘 할 일을 정리해봤어.")을 채워 저장하므로 기록의 `answer`가 모델 원문이 아닐 수 있다. 상세·재생 화면은 그 경우 말풍선 옆에 "서버 기본 문구" 꼬리표를 단다(`src/lib/response.ts`). 질문 문구 200자·선택지 40자(UTF-16) 초과는 출력 검증에서 `question_length`·`option_length`로 거절돼 `correction_requested` 뒤 재시도되고, 새 할 일·계획 생성 도구의 `estimated_minutes`는 필수라 빠뜨리면 `INVALID_ARGUMENT` 도구 실패 단계가 하나 더 남는다
- **가드레일 단계 이름**: 입력은 `target_ownership`·`answer_bundle`, 도구는 단계 앞뒤의 `<도구>.arguments`·`<도구>.result`(인자 검사에서 막히면 결과 검사 없음), 출력은 `structure`·`length`·`references`·`card_count`·`missing_cards`(통과면 다섯 개 모두, 거절이면 걸린 하나), 한도는 `time`·`model_turns`다. 도구·출력 층은 untangle-ai-v2 #72부터 기록된다. 그 전 기록에는 입력·한도 층만 있다
- **mock**: 예시 데이터 64건(설계 문서의 검증 사례 19종 × 3회 + 실제 요청 4세션 7턴, 그중 끝나지 않은 요청 1건)으로 여섯 조회 API를 흉내 낸다. 필터·커서 페이지·요약·집계를 서버와 같은 규칙으로 계산한다(평균·합계에서 null 제외, 범위를 벗어난 `limit`·조건이 다른 커서는 422, 없는 대상은 404). 케이스 번호와 제목은 `src/lib/cases.ts`, 시나리오는 `src/api/mock/fixtures.ts`

### 화면 규칙

- **디자인 토큰**: 피그마 "Dashboard v2 · Design System"의 변수를 `src/styles/tokens.css`에 그대로 옮겼다. 컴포넌트 CSS는 변수만 쓴다. 화면 정본은 같은 파일의 "Dashboard v2 · Screens"
- **상태 색**: 정상은 행을 칠하지 않고 문제가 있는 상태만 연하게 칠한다. 서버 오류는 어두운 배지
- **가드레일**: 단계 타임라인·집계 모두 같은 줄무늬 차단봉(`.stripes`)으로 그린다. 통과는 회색 점, 차단은 빨간 배지
- **도구 색**: 조회 = 파랑, 제안 = 주황, 브리핑 = 초록. 램프(`--ramp-*`)는 호출 많은 순
- **시각**: 모두 한국 시간(UTC+9). 계획의 날짜·시각은 기기 시간대 값이라 변환하지 않고 적힌 그대로 보인다
- **ID**: UUID는 앞 8자리만 보이고 누르면 전체 값이 복사된다
- **핸드폰**: 화면 폭 720px 이하에서 핸드폰 배치로 바뀐다. 표는 한 행을 두세 줄 카드로 접고, 상세 패널과 재생은 화면 전체로 열린다. 메뉴는 옆으로 밀어 넘긴다. 집계의 도구·가드레일·케이스 표는 표 안에서만 옆으로 밀어 본다
