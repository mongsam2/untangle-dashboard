// 표시용 숫자·시각 포맷. 시각은 항상 한국 시간(UTC+9)으로 보여준다.

const KST_OFFSET_MS = 9 * 3600000;
const pad = (x: number) => String(x).padStart(2, '0');

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

export function fmtCost(c: number | null | undefined): string {
  return c == null ? '-' : '$' + c.toFixed(4);
}

export function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return '-';
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

/**
 * 목록의 시각. 오늘(한국 시간) 기록은 시:분:초, 그 전 기록은 날짜를 붙여 월/일 시:분으로 보인다.
 */
export function fmtStamp(iso: string, now: number = Date.now()): string {
  const d = kst(iso);
  const today = new Date(now + KST_OFFSET_MS);
  const sameDay =
    d.getUTCFullYear() === today.getUTCFullYear() && d.getUTCMonth() === today.getUTCMonth() && d.getUTCDate() === today.getUTCDate();
  if (sameDay) return fmtTime(iso);
  return pad(d.getUTCMonth() + 1) + '/' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUID는 앞 8자리만 보인다. 전체 값은 title이나 복사로 확인한다. UUID가 아니면 그대로 둔다. */
export function shortId(id: string): string {
  return UUID_RE.test(id) ? id.slice(0, 8) + '…' : id;
}

export function fmtDateTime(iso: string): string {
  const d = kst(iso);
  return d.getUTCMonth() + 1 + '월 ' + d.getUTCDate() + '일 ' + fmtTime(iso);
}

/** 계획의 날짜(`YYYY-MM-DD`)와 시각(`HH:mm`). 기기 시간대 기준 값이라 변환하지 않고 적힌 그대로 읽는다. */
export function fmtWall(date: string | null | undefined, time: string | null | undefined): string | null {
  const m = date ? /^\d{4}-(\d{2})-(\d{2})$/.exec(date) : null;
  const day = m ? Number(m[1]) + '월 ' + Number(m[2]) + '일' : (date ?? null);
  return [day, time].filter(Boolean).join(' ') || null;
}

/** 0~1 비율을 퍼센트 문자열로. */
export function fmtPct(ratio: number, digits = 1): string {
  return (ratio * 100).toFixed(digits) + '%';
}

export function fmtMinutes(min: number | null | undefined): string {
  if (min == null) return '미정';
  if (min < 60) return min + '분';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? h + '시간 ' + m + '분' : h + '시간';
}
