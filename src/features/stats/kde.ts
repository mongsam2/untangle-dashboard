import { fmtInt } from '../../lib/format';

export interface KdeModel {
  median: string;
  mean: string;
  max: string;
  area: string;
  line: string;
  medianLine: string;
  rug: { x: string; title: string }[];
  ticks: { x: string; shift: string; label: string }[];
  aria: string;
}

export const KDE_W = 600;
export const KDE_H = 180;
const N = 120;

/**
 * 요청당 총 토큰의 커널 밀도 곡선(viewBox 600×180 경로).
 * 띠폭은 실버먼 규칙(최소 1500), 0 아래로 새는 밀도는 0에서 반사한다.
 */
export function computeKde(samples: number[]): KdeModel {
  const out: KdeModel = { median: '-', mean: '-', max: '-', area: '', line: '', medianLine: '', rug: [], ticks: [], aria: '요청당 토큰 분포' };
  const vals = [...samples].sort((a, b) => a - b);
  const nv = vals.length;
  if (!nv) return out;
  const mean = vals.reduce((a, x) => a + x, 0) / nv;
  const sd = Math.sqrt(vals.reduce((a, x) => a + (x - mean) * (x - mean), 0) / nv) || 1000;
  const bw = Math.max(1500, 1.06 * sd * Math.pow(nv, -0.2));
  const top = Math.max(10000, Math.ceil((vals[nv - 1]! * 1.1) / 10000) * 10000);
  const ys: number[] = [];
  for (let i = 0; i <= N; i++) {
    const x = (top * i) / N;
    let d = 0;
    for (const v of vals) d += Math.exp(-0.5 * ((x - v) / bw) ** 2) + Math.exp(-0.5 * ((x + v) / bw) ** 2);
    ys.push(d);
  }
  const ymax = Math.max(...ys) || 1;
  const pts = ys.map((y, i) => ((KDE_W * i) / N).toFixed(1) + ',' + (176 - (y / ymax) * 166).toFixed(1));
  out.line = 'M' + pts.join(' L');
  out.area = out.line + ` L${KDE_W},${KDE_H} L0,${KDE_H} Z`;
  const med = nv % 2 ? vals[(nv - 1) / 2]! : (vals[nv / 2 - 1]! + vals[nv / 2]!) / 2;
  const mx = ((KDE_W * med) / top).toFixed(1);
  out.medianLine = 'M' + mx + ',4 L' + mx + ',' + KDE_H;
  out.median = fmtInt(med);
  out.mean = fmtInt(mean);
  out.max = fmtInt(vals[nv - 1]!);
  out.rug = vals.map((v) => ({ x: ((v / top) * 100).toFixed(2), title: fmtInt(v) + ' 토큰' }));
  const step = top / 5;
  for (let i = 0; i <= 5; i++) {
    out.ticks.push({ x: (i * 20).toFixed(0), shift: i === 0 ? '0' : i === 5 ? '-100%' : '-50%', label: i === 0 ? '0' : Math.round((step * i) / 1000) + 'K' });
  }
  out.aria = '요청당 토큰 분포. 중앙값 ' + out.median + ', 평균 ' + out.mean + ', 최대 ' + out.max + ' 토큰';
  return out;
}
