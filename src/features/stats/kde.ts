// 요청당 토큰 분포. 가우시안 커널 밀도 추정으로 곡선을 그린다. 라이브러리 없이 계산한다.

export interface Kde {
  xs: number[];
  ys: number[];
  mean: number;
  median: number;
  max: number;
  sd: number;
  n: number;
}

const POINTS = 96;

export function computeKde(samples: number[]): Kde | null {
  const xs0 = samples.filter((x) => Number.isFinite(x) && x >= 0);
  const n = xs0.length;
  if (!n) return null;
  const sorted = [...xs0].sort((a, b) => a - b);
  const mean = sorted.reduce((a, x) => a + x, 0) / n;
  const median = n % 2 ? sorted[(n - 1) / 2]! : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
  const max = sorted[n - 1]!;
  const sd = Math.sqrt(sorted.reduce((a, x) => a + (x - mean) ** 2, 0) / n);
  // Silverman 대역폭. 표본이 하나거나 분산이 0이면 최대값의 10%로 둔다.
  const bw = sd > 0 && n > 1 ? 1.06 * sd * n ** -0.2 : Math.max(max * 0.1, 1);
  const hi = max + bw * 2;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < POINTS; i += 1) {
    const x = (hi * i) / (POINTS - 1);
    let y = 0;
    for (const s of sorted) {
      const z = (x - s) / bw;
      y += Math.exp(-0.5 * z * z);
    }
    xs.push(x);
    ys.push(y / (n * bw * Math.sqrt(2 * Math.PI)));
  }
  return { xs, ys, mean, median, max, sd, n };
}

/** 곡선을 SVG path로. 아래를 채우는 닫힌 영역이다. */
export function areaPath(k: Kde, width: number, height: number): string {
  const yMax = Math.max(...k.ys) || 1;
  const pts = k.xs.map((x, i) => [(x / (k.xs[k.xs.length - 1] || 1)) * width, height - (k.ys[i]! / yMax) * (height - 8)] as const);
  const line = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  return line + ` L${width} ${height} L0 ${height} Z`;
}
