import type { RunListItem } from '../../api/types';
import { fmtInt } from '../../lib/format';
import { TOK } from '../../lib/kinds';
import s from './TokenBars.module.css';

interface Seg {
  name: string;
  full: string;
  value: number;
  color: string;
}

// 요청 전체의 입력·출력 토큰 구성 막대.
export function TokenBars({ run }: { run: RunListItem }) {
  const bars: { label: string; total: number; segs: Seg[] }[] = [
    {
      label: '입력 토큰',
      total: run.input_tokens,
      segs: [
        { name: '비캐시', full: '비캐시 입력', value: run.input_tokens - run.cached_tokens, color: TOK.fresh },
        { name: '캐시', full: '캐시 입력', value: run.cached_tokens, color: TOK.cached },
      ],
    },
    {
      label: '출력 토큰',
      total: run.output_tokens,
      segs: [
        { name: '답변', full: '답변 출력', value: run.output_tokens - run.reasoning_tokens, color: TOK.answer },
        { name: '추론', full: '추론 출력', value: run.reasoning_tokens, color: TOK.reason },
      ],
    },
  ];
  return (
    <div className={`card ${s.card}`}>
      {bars.map((b) => {
        const denom = Math.max(b.total, 1);
        return (
          <div key={b.label} className={s.bar}>
            <div className={s.head}>
              <span className={s.label}>{b.label}</span>
              <span className={`mono ${s.total}`}>{fmtInt(b.total)}</span>
            </div>
            <div className={s.track}>
              {b.segs.map((g) => (
                <div key={g.name} title={g.full + ' ' + fmtInt(g.value)} className={s.seg} style={{ width: ((g.value / denom) * 100).toFixed(2) + '%', background: g.color }} />
              ))}
            </div>
            <div className={s.legend}>
              {b.segs.map((g) => (
                <span key={g.name} className={s.legendItem}>
                  <span className="dot" style={{ background: g.color }} />
                  {g.name} <span className="mono">{fmtInt(g.value)}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
