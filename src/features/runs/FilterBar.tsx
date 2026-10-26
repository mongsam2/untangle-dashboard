import { useOutletContext } from 'react-router-dom';
import { useRunSummary } from '../../api/queries';
import type { RunSource, RunStatus } from '../../api/types';
import type { ShellContext } from '../../app/AppShell';
import { Button } from '../../components/Button';
import { FilterIcon } from '../../components/icons';
import { Segmented } from '../../components/Segmented';
import { ROW_TINT, RUN_STATUS, RUN_STATUS_HINT, RUN_STATUS_ORDER } from '../../lib/status';
import s from './FilterBar.module.css';
import { useRunFilters } from './useRunFilters';

const PANEL_ID = 'filters';
const LABEL_W = 72;

// 필터 버튼, 상태 범례, 펼쳐지는 필터 패널. 요청 목록과 집계가 같이 쓴다.
export function FilterBar({ showLegend }: { showLegend?: boolean }) {
  const { filtersOpen, toggleFilters } = useOutletContext<ShellContext>();
  const { filters, setFilter, active } = useRunFilters();
  // 출처 칩의 건수는 다른 필터와 무관한 전체 건수다.
  const all = useRunSummary({}).data;

  return (
    <>
      <div className={s.bar}>
        <Button variant="outline" filled={filtersOpen || active > 0} aria-expanded={filtersOpen} aria-controls={PANEL_ID} onClick={toggleFilters}>
          <FilterIcon />
          {active ? '필터 ' + active : '필터'}
        </Button>
        {showLegend && (
          <span className={s.legend}>
            {RUN_STATUS_ORDER.map((st) => (
              <span key={st} className={s.legendItem} title={RUN_STATUS_HINT[st]}>
                <span className={s.swatch} style={{ background: ROW_TINT[st] || 'var(--surface-document)' }} />
                {RUN_STATUS[st].label}
              </span>
            ))}
          </span>
        )}
      </div>
      {filtersOpen && (
        <div id={PANEL_ID} className={`card ${s.panel}`}>
          <Segmented<RunSource>
            label="출처"
            labelWidth={LABEL_W}
            value={filters.source}
            onChange={(v) => setFilter('source', v)}
            options={[
              { value: 'all', label: '전체', count: all?.runs ?? 0 },
              { value: 'test', label: '테스트', count: all?.test_runs ?? 0 },
              { value: 'real', label: '실제 요청', count: all?.real_runs ?? 0 },
            ]}
          />
          <Segmented<RunStatus | 'all'>
            label="상태"
            labelWidth={LABEL_W}
            value={filters.status ?? 'all'}
            onChange={(v) => setFilter('status', v)}
            options={[{ value: 'all' as const, label: '전체' }, ...RUN_STATUS_ORDER.map((st) => ({ value: st, label: RUN_STATUS[st].label, title: RUN_STATUS_HINT[st] }))]}
          />
        </div>
      )}
    </>
  );
}
