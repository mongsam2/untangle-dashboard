import type { RunListItem } from '../../api/types';
import { fmtCost, fmtInt, fmtPct } from '../../lib/format';
import type { DisplayStep } from './displaySteps';
import s from './TokenTable.module.css';

interface TokenTableProps {
  run: RunListItem;
  models: DisplayStep[];
  selected: number | null;
  onSelect: (seq: number | null) => void;
}

// 모델 호출별 토큰 표. 행을 누르면 왼쪽의 같은 단계 카드가 선택된다.
export function TokenTable({ run, models, selected, onSelect }: TokenTableProps) {
  if (!models.length) return null;
  const hit = run.input_tokens ? run.cached_tokens / run.input_tokens : 0;
  return (
    <div className={`card ${s.card}`}>
      <span className={s.title}>모델 호출별 토큰</span>
      <div className={s.table}>
        <div className={`${s.row} ${s.header}`}>
          <span className="th">#</span>
          <span className="th">입력</span>
          <span className="th">캐시</span>
          <span className="th">출력</span>
          <span className="th">추론</span>
          <span className="th">비용</span>
        </div>
        {models.map((m) => (
          <button key={m.seq} type="button" className={`mono ${s.row} ${selected === m.seq ? s.selected : ''}`} aria-pressed={selected === m.seq} onClick={() => onSelect(selected === m.seq ? null : m.seq)}>
            <span>#{m.modelIndex}</span>
            <span>{fmtInt(m.input_tokens ?? 0)}</span>
            <span>{fmtInt(m.cached_tokens ?? 0)}</span>
            <span>{fmtInt(m.output_tokens ?? 0)}</span>
            <span>{fmtInt(m.reasoning_tokens ?? 0)}</span>
            <span>{fmtCost(m.cost_usd)}</span>
          </button>
        ))}
        <div className={`mono ${s.row} ${s.total}`}>
          <span>합</span>
          <span>{fmtInt(run.input_tokens)}</span>
          <span>{fmtInt(run.cached_tokens)}</span>
          <span>{fmtInt(run.output_tokens)}</span>
          <span>{fmtInt(run.reasoning_tokens)}</span>
          <span>{fmtCost(run.cost_usd)}</span>
        </div>
      </div>
      <div className={s.foot}>
        <span>캐시 적중률</span>
        <span className="mono">{fmtPct(hit)}</span>
      </div>
    </div>
  );
}
