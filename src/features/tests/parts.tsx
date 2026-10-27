import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import { CheckIcon, ChevronDownIcon, CloseIcon } from '../../components/icons';
import s from './parts.module.css';
import { CONFIG_LETTERS, configShort, JUDGE_LABEL, type RateLevel, type TestCheck, type TestConfig } from './testModel';

// 테스트 탭 전용 조각. 피그마 "Dashboard v2 · Design System"의 테스트 탭 컴포넌트(648:1449)와 Tag를 옮겼다.

export type TagTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function Tag({ tone, children }: { tone: TagTone; children: ReactNode }) {
  return <span className={`${s.tag} ${s[tone]}`}>{children}</span>;
}

/** 통과율 칸. 색은 rateLevel·countLevel이 정한다. */
export function RateCell({ level, size = 'md', children }: { level: RateLevel; size?: 'md' | 'sm' | 'xs'; children: ReactNode }) {
  return <span className={`mono ${s.rate} ${s[`rate_${level}`]} ${s[`rate_${size}`]}`}>{children}</span>;
}

/**
 * 비교 설정 표시. 같은 실행 안에서 A·B 색을 모든 화면에 똑같이 쓴다.
 * compact면 핸드폰에서 글자(A·B)만 남긴다. 좁은 표 머리에 쓴다.
 */
export function ConfigChip({ index, config, compact }: { index: number; config: TestConfig; compact?: boolean }) {
  const letter = CONFIG_LETTERS[index] ?? '?';
  return (
    <span className={`${s.chip} ${compact ? s.chipCompact : ''}`} title={configShort(config)}>
      <span className={`${s.letter} ${s[`letter${letter}`]}`}>{letter}</span>
      <span className={s.chipText}>{configShort(config)}</span>
    </span>
  );
}

export function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${s.panel} ${className ?? ''}`}>
      <h2 className={s.panelTitle}>{title}</h2>
      {children}
    </section>
  );
}

export function Meta({ label, value, mono, wide }: { label: string; value: ReactNode; mono?: boolean; wide?: boolean }) {
  return (
    <div className={`${s.meta} ${wide ? s.metaWide : ''}`}>
      <span className={s.metaLabel}>{label}</span>
      <span className={mono ? `mono ${s.metaMono}` : s.metaValue}>{value}</span>
    </div>
  );
}

/** 체크리스트 한 줄: 통과·실패 표시, 체크 항목, 판정 방법 */
export function CheckRow({ check, ok }: { check: TestCheck; ok: boolean }) {
  return (
    <div className={s.check}>
      <span className={`${s.mark} ${ok ? s.markPass : s.markFail}`} aria-label={ok ? '통과' : '실패'}>
        {ok ? <CheckIcon size={14} /> : <CloseIcon size={14} />}
      </span>
      <span className={s.checkText}>{check.text}</span>
      <span className={`mono ${s.judge}`}>{JUDGE_LABEL[check.judge]}</span>
    </div>
  );
}

/** 진행 막대. tone이 없으면 회색 막대다. */
export function ProgressBar({ ratio, tone }: { ratio: number; tone?: number }) {
  const fill = tone === 0 ? s.fillA : tone === 1 ? s.fillB : s.fillNeutral;
  return (
    <span className={s.track}>
      <span className={`${s.fill} ${fill}`} style={{ width: `${Math.min(1, Math.max(0, ratio)) * 100}%` }} />
    </span>
  );
}

export interface DropdownItem<T extends string> {
  value: T;
  label: ReactNode;
}

/** 테두리 버튼을 누르면 아래로 펼쳐지는 고르기 목록. 바깥을 누르거나 Esc로 닫는다. */
export function Dropdown<T extends string>({ label, items, value, onSelect, ariaLabel }: { label: ReactNode; items: DropdownItem<T>[]; value: T; onSelect: (v: T) => void; ariaLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={s.dropdown} ref={ref}>
      <Button variant="outline" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ChevronDownIcon />
        {label}
      </Button>
      {open && (
        <ul className={s.menu} role="listbox" aria-label={ariaLabel}>
          {items.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                role="option"
                aria-selected={item.value === value}
                className={s.menuItem}
                onClick={() => {
                  onSelect(item.value);
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
