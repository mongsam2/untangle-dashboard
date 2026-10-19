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

- **mock**(기본): `src/api/mock/`의 예시 데이터 50건(테스트 케이스 11개 × 4회, 실제 요청 4건, 응답 오류 2건)으로 네 조회 API를 흉내 낸다. 필터·커서 페이지·요약·집계도 서버와 같은 모양으로 계산한다. 서버 없이 바로 쓸 수 있다.
- **live**: 개발 서버가 `/v1` 요청을 탱글 서버로 프록시한다. 서버에 `TANGLE_DASHBOARD_TOKEN`이 설정돼 있어야 대시보드 API가 열린다.

```sh
cp .env.example .env   # 값을 채운 뒤
VITE_API_MODE=live bun run dev
```

## 환경 변수

`.env`(커밋하지 않음) 또는 셸 환경으로 넣는다.

| 변수 | 기본값 | 의미 |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock` 또는 `live` |
| `TANGLE_SERVER_URL` | `http://127.0.0.1:8010` | live 모드에서 `/v1`을 넘길 탱글 서버 주소 |
| `TANGLE_DASHBOARD_TOKEN` | 없음 | 서버의 같은 이름 설정값. 개발 서버 프록시가 `Authorization: Bearer …` 헤더로 붙인다 |

토큰은 `vite.config.ts`의 프록시에서만 쓰고 브라우저 코드로는 내보내지 않는다(`VITE_` 접두사가 없는 변수는 번들에 들어가지 않는다). 그래서 live 모드는 `bun run dev`에서만 동작한다.

## API 타입 생성

`src/api/types.ts`는 서버의 `schemas/dashboard.py`를 손으로 옮긴 임시본이다. 서버를 띄운 뒤 아래 명령으로 `src/api/schema.d.ts`를 만들고, `types.ts`를 생성된 타입의 별칭으로 바꾼다.

```sh
bun run gen:api   # openapi-typescript http://localhost:8010/openapi.json -o src/api/schema.d.ts
```

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
  api/            types.ts(응답 타입), client.ts(mock/live 분기), queries.ts(TanStack Query 훅), mock/(예시 데이터·핸들러·집계)
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
