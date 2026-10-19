import { Button } from './Button';
import s from './Segmented.module.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedProps<T extends string> {
  label: string;
  /** 라벨 칸 너비. 필터 행처럼 줄을 맞출 때 쓴다. */
  labelWidth?: number;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ label, labelWidth, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className={s.row} role="group" aria-label={label}>
      <span className={`th ${s.label}`} style={labelWidth ? { width: labelWidth } : undefined}>
        {label}
      </span>
      {options.map((o) => (
        <Button key={o.value} variant="chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className={`mono ${s.count}`}>{o.count}</span>}
        </Button>
      ))}
    </div>
  );
}
