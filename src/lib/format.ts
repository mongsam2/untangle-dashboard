// 표시용 숫자·시각 포맷. 시각은 항상 한국 시간(UTC+9)으로 보여준다.

const KST_OFFSET_MS = 9 * 3600000;
const pad = (x: number) => String(x).padStart(2, '0');

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

export function fmtCost(c: number | null | undefined): string {
  return c == null ? '-' : '$' + c.toFixed(4);
}

export function fmtMs(ms: number): string {
  const v = Math.round(ms);
  return v < 1000 ? v + 'ms' : (v / 1000).toFixed(1) + 's';
}

/** 재생 화면의 초 단위 표기. 짧을수록 자릿수를 늘린다. */
export function fmtSec(ms: number): string {
  return (ms / 1000).toFixed(ms < 100 ? 3 : ms < 1000 ? 2 : 1) + 's';
}

function kst(iso: string): Date {
  return new Date(Date.parse(iso) + KST_OFFSET_MS);
}

export function fmtTime(iso: string): string {
  const d = kst(iso);
  return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
}

export function fmtDateTime(iso: string): string {
  const d = kst(iso);
  return d.getUTCMonth() + 1 + '월 ' + d.getUTCDate() + '일 ' + fmtTime(iso);
}

export function fmtDeadline(iso: string): string {
  const d = kst(iso);
  return d.getUTCMonth() + 1 + '월 ' + d.getUTCDate() + '일 ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

/** 0~1 비율을 퍼센트 문자열로. */
export function fmtPct(ratio: number, digits = 1): string {
  return (ratio * 100).toFixed(digits) + '%';
}
