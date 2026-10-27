import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { CheckIcon, CloseIcon, MinusIcon, PlusIcon } from '../../components/icons';
import s from './NewRunModal.module.css';
import { Meta, Tag } from './parts';
import { attemptCost, EFFORTS, JUDGE_COST, JUDGE_LABEL_TEXT, MODELS, PARALLEL, SAMPLE_CONFIG_OPTIONS } from './sampleData';
import {
  CATEGORIES,
  caseValues,
  CONFIG_LETTERS,
  estimate,
  failedCaseIds,
  fmtMinutes,
  MAX_CONFIGS,
  sameConfig,
  type CategoryKey,
  type Effort,
  type TestCase,
  type TestConfig,
  type TestRun,
} from './testModel';
import type { NewRun } from './useTestRuns';

type Scope = 'all' | 'category' | 'failed';

const MIN_REPEATS = 1;
const MAX_REPEATS = 5;

interface NewRunModalProps {
  cases: TestCase[];
  /** '지난 실행에서 실패한 케이스'가 보는 실행 */
  lastRun: TestRun | null;
  onClose: () => void;
  onStart: (run: NewRun) => void;
}

// 새 실행 만들기 팝업. 설정은 최대 2개(A·B)까지 고르고, 고른 순서대로 A·B가 된다.
export function NewRunModal({ cases, lastRun, onClose, onStart }: NewRunModalProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<TestConfig[]>(SAMPLE_CONFIG_OPTIONS);
  const [selected, setSelected] = useState<number[]>([0, 1]);
  const [adding, setAdding] = useState(false);
  const [model, setModel] = useState(MODELS[0]!);
  const [effort, setEffort] = useState<Effort>('medium');
  const [scope, setScope] = useState<Scope>('all');
  const [picks, setPicks] = useState<Partial<Record<CategoryKey, string[]>>>({});
  const [repeats, setRepeats] = useState(3);

  // 진행 중인 실행 때문에 부모가 1초마다 다시 그려도 포커스를 다시 옮기지 않게 처음 한 번만 건다.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const failed = new Set(failedCaseIds(lastRun));
  const chosen = cases.filter((c) => {
    if (scope === 'failed') return failed.has(c.id);
    if (scope === 'all') return true;
    // 카테고리 안에서는 고른 값 중 하나, 카테고리끼리는 모두 맞아야 한다.
    return CATEGORIES.every((cat) => {
      const want = picks[cat.key] ?? [];
      return !want.length || caseValues(c, cat.key).some((x) => want.includes(x));
    });
  });
  const configs = selected.map((i) => options[i]!);
  const est = estimate(configs.map(attemptCost), JUDGE_COST, chosen.length, repeats, PARALLEL);

  const toggle = (i: number) => setSelected((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : cur.length < MAX_CONFIGS ? [...cur, i] : cur));
  const add = () => {
    const config = { model, effort };
    const found = options.findIndex((o) => sameConfig(o, config));
    const index = found >= 0 ? found : options.length;
    if (found < 0) setOptions([...options, config]);
    setSelected((cur) => (cur.includes(index) || cur.length >= MAX_CONFIGS ? cur : [...cur, index]));
    setAdding(false);
  };
  const pick = (key: CategoryKey, id: string) =>
    setPicks((cur) => {
      const list = cur[key] ?? [];
      return { ...cur, [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
    });

  return (
    <div className={s.scrim} onClick={onClose}>
      <div ref={dialog} className={s.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <h2 id={titleId} className={s.title}>
            새 실행
          </h2>
          <button type="button" className={s.close} aria-label="닫기" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className={s.content}>
          <section className={s.section}>
            <h3 className={s.label}>비교할 설정</h3>
            <div className={s.options}>
              {options.map((o, i) => {
                const order = selected.indexOf(i);
                const on = order >= 0;
                const full = !on && selected.length >= MAX_CONFIGS;
                return (
                  <button key={`${o.model}-${o.effort}`} type="button" role="checkbox" aria-checked={on} disabled={full} className={`${s.option} ${on ? s.optionOn : ''}`} onClick={() => toggle(i)}>
                    <span className={`${s.box} ${on ? s.boxOn : ''}`}>{on && <CheckIcon size={14} />}</span>
                    <span className={s.model}>{o.model}</span>
                    <span className={s.effort}>추론 {o.effort}</span>
                    <span className={s.note}>{on ? CONFIG_LETTERS[order] : ''}</span>
                  </button>
                );
              })}
            </div>
            {adding ? (
              <div className={s.addRow}>
                <select className={s.select} aria-label="모델" value={model} onChange={(e) => setModel(e.target.value)}>
                  {MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select className={s.select} aria-label="추론 강도" value={effort} onChange={(e) => setEffort(e.target.value as Effort)}>
                  {EFFORTS.map((x) => (
                    <option key={x} value={x}>
                      추론 {x}
                    </option>
                  ))}
                </select>
                <Button variant="soft" onClick={add}>
                  추가
                </Button>
                <Button variant="text" onClick={() => setAdding(false)}>
                  취소
                </Button>
              </div>
            ) : (
              <div>
                <Button variant="text" onClick={() => setAdding(true)}>
                  <PlusIcon />
                  설정 추가
                </Button>
              </div>
            )}
          </section>
          <section className={s.section}>
            <h3 className={s.label}>케이스 범위</h3>
            <div className={s.chips}>
              <Button variant="chip" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
                전체 {cases.length}개
              </Button>
              <Button variant="chip" aria-pressed={scope === 'category'} onClick={() => setScope('category')}>
                카테고리로 고르기
              </Button>
              <Button variant="chip" aria-pressed={scope === 'failed'} disabled={!failed.size} onClick={() => setScope('failed')}>
                지난 실행에서 실패한 케이스
              </Button>
            </div>
            {scope === 'category' && (
              <div className={s.picker}>
                {CATEGORIES.map((cat) => (
                  <div key={cat.key} className={s.pickRow} role="group" aria-label={cat.title}>
                    <span className={s.pickLabel}>{cat.title}</span>
                    {cat.values.map((val) => (
                      <Button key={val.id} variant="chip" className={s.pickChip} aria-pressed={(picks[cat.key] ?? []).includes(val.id)} onClick={() => pick(cat.key, val.id)}>
                        {val.label}
                      </Button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
          <div className={s.pair}>
            <section className={s.section}>
              <h3 className={s.label}>반복 횟수</h3>
              <div className={s.stepper}>
                <button type="button" className={s.round} aria-label="한 번 줄이기" disabled={repeats <= MIN_REPEATS} onClick={() => setRepeats((n) => n - 1)}>
                  <MinusIcon />
                </button>
                <span className="mono">{repeats}회</span>
                <button type="button" className={s.round} aria-label="한 번 늘리기" disabled={repeats >= MAX_REPEATS} onClick={() => setRepeats((n) => n + 1)}>
                  <PlusIcon />
                </button>
              </div>
            </section>
            <section className={s.section}>
              <h3 className={s.label}>채점 모델</h3>
              <div className={s.judge}>
                <span>{JUDGE_LABEL_TEXT}</span>
                <Tag tone="neutral">고정</Tag>
              </div>
            </section>
          </div>
          <div className={s.estimate}>
            <Meta label="예상 호출" value={`${est.calls}회`} mono wide />
            <Meta label="예상 비용" value={`약 $${est.costUsd.toFixed(2)}`} mono wide />
            <Meta label="예상 시간" value={`약 ${fmtMinutes(est.durationMs)}`} mono wide />
          </div>
        </div>
        <div className={s.foot}>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" disabled={!configs.length || !chosen.length} onClick={() => onStart({ configs, repeats, caseIds: chosen.map((c) => c.id) })}>
            실행 시작
          </Button>
        </div>
      </div>
    </div>
  );
}
