// 대시보드가 기록을 읽어 오는 서버. 개발·운영은 백엔드 운영자 API를 거치고, 로컬은 내 컴퓨터의 탱글 서버에 직접 붙는다.
// 어떤 서버가 연결됐는지는 접근 키 확인(/api/access) 응답으로 받는다. 주소와 키는 브라우저로 오지 않는다.
// server/dashboardApi.ts의 SERVER_IDS와 같은 목록이다.

export const SERVER_IDS = ['dev', 'prod', 'local'] as const;

export type ServerId = (typeof SERVER_IDS)[number];

export const SERVER_LABELS: Record<ServerId, string> = {
  dev: '개발',
  prod: '운영',
  local: '로컬',
};

export function isServerId(value: unknown): value is ServerId {
  return typeof value === 'string' && (SERVER_IDS as readonly string[]).includes(value);
}

/** 지난번에 고른 서버가 아직 설정돼 있으면 그대로, 아니면 목록의 첫 서버를 쓴다. */
export function pickServer(stored: string | null, available: readonly ServerId[]): ServerId | null {
  if (isServerId(stored) && available.includes(stored)) return stored;
  return available[0] ?? null;
}
