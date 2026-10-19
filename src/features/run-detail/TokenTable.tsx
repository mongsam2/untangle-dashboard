import type { RunListItem } from '../../api/types';
import { fmtCost, fmtInt } from '../../lib/format';
import type { DisplayStep } from './displaySteps';
import { tokensOf } from './displaySteps';
import s from './TokenTable.module.css';

interface TokenTableProps {
  run: RunListItem;
  models: DisplayStep[];
  selected: number | null;
  onSelect: (seq: number | null) => void;
}

// 모델 호출별 토큰 표. 행을 누르면 왼쪽의 같은 단계 카드가 선택된다.
export function TokenTable({ run, models, selected, onSelect }: TokenTableProps) {
  return (
    <div className={`card ${s.card}`}>
      <span className={s.title}>모델 호출별 토큰</span>
      {models.length === 0 ? (
        <div className={s.none}>이 요청은 서버가 모델 없이 처리해서 토큰을 쓰지 않았어요.</div>
      ) : (
        <>
          <div className={s.scroll}>
            <div className={s.table}>
              <div className={s.row}>
                <span className="th">#</span>
                <span className={`th ${s.r}`}>입력</span>
                <span className={`th ${s.r}`}>캐시</span>
                <span className={`th ${s.r}`}>출력</span>
                <span className={`th ${s.r}`}>추론</span>
                <span className={`th ${s.r}`}>비용</span>
              </div>
              {models.map((m) => {
                const t = tokensOf(m);
                const on = selected === m.seq;
                return (
                  <button key={m.seq} type="button" className={`mono ${s.row} ${s.data} ${on ? s.on : ''}`} aria-pressed={on} onClick={() => onSelect(on ? null : m.seq)}>
                    <span className={s.l}>#{m.modelIndex}</span>
                    <span className={s.r}>{fmtInt(t.input)}</span>
                    <span className={s.r}>{fmtInt(t.cached)}</span>
                    <span className={s.r}>{fmtInt(t.output)}</span>
                    <span className={s.r}>{fmtInt(t.reasoning)}</span>
                    <span className={s.r}>{fmtCost(m.cost_usd)}</span>
                  </button>
                );
              })}
              <div className={`mono ${s.row} ${s.sum}`}>
                <span className={s.sumLabel}>합계</span>
                <span className={s.r}>{fmtInt(run.input_tokens)}</span>
                <span className={s.r}>{fmtInt(run.cached_tokens)}</span>
                <span className={s.r}>{fmtInt(run.output_tokens)}</span>
                <span className={s.r}>{fmtInt(run.reasoning_tokens)}</span>
                <span className={s.r}>{fmtCost(run.cost_usd)}</span>
              </div>
            </div>
          </div>
          <div className={s.rate}>
            <span>캐시 적중률</span>
            <span className="mono">{((run.cached_tokens / Math.max(run.input_tokens, 1)) * 100).toFixed(1)}%</span>
          </div>
        </>
      )}
    </div>
  );
}
