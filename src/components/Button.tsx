import type { ButtonHTMLAttributes } from 'react';
import s from './Button.module.css';

type Variant = 'pill' | 'chip' | 'primary' | 'icon' | 'iconPrimary' | 'text';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** pill을 채운 모양으로 바꾼다(필터가 켜졌을 때). */
  filled?: boolean;
  /** icon 버튼 배경. */
  tone?: 'parchment' | 'glass';
}

export function Button({ variant = 'pill', filled, tone = 'parchment', className, type = 'button', ...rest }: ButtonProps) {
  const cls = [s.base, s[variant], filled ? s.filled : '', variant === 'icon' ? s[tone] : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={cls} {...rest} />;
}
