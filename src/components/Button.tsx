import type { ButtonHTMLAttributes } from 'react';
import s from './Button.module.css';

type Variant = 'outline' | 'chip' | 'primary' | 'soft' | 'icon' | 'iconPrimary' | 'text';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** outline을 강조한 모양으로 바꾼다(필터가 켜졌을 때). */
  filled?: boolean;
}

export function Button({ variant = 'outline', filled, className, type = 'button', ...rest }: ButtonProps) {
  const cls = [s.base, s[variant], filled ? s.filled : '', className ?? ''].filter(Boolean).join(' ');
  return <button type={type} className={cls} {...rest} />;
}
