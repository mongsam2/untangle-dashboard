import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { GuardrailLayer } from '../../../api/types';
import { guardrailInfo } from '../../../lib/guardrails';
import { GUARD_LAYER } from '../../../lib/kinds';
import s from './GuardrailInfoPopover.module.css';

interface GuardrailInfoPopoverProps {
  /** 팝업을 붙일 가드레일 단계 버튼 */
  anchor: RefObject<HTMLElement>;
  layer: GuardrailLayer | null;
  name: string | null;
  onClose: () => void;
}

const GAP = 6;
const MARGIN = 16;
const WIDTH = 320;

// 가드레일 단계를 누르면 그 검사가 무엇을 보고 막히면 어떻게 되는지 짧게 보인다.
// 재생 화면의 단계 흐름처럼 스크롤 상자 안에서도 잘리지 않게 body에 띄우고, 스크롤하면 버튼을 따라간다.
export function GuardrailInfoPopover({ anchor, layer, name, onClose }: GuardrailInfoPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const info = guardrailInfo(layer, name);

  const place = useCallback(() => {
    const a = anchor.current?.getBoundingClientRect();
    const h = ref.current?.offsetHeight ?? 0;
    if (!a) return;
    const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2);
    const left = Math.min(Math.max(a.left, MARGIN), window.innerWidth - width - MARGIN);
    const below = a.bottom + GAP;
    const top = below + h > window.innerHeight - MARGIN && a.top - GAP - h > MARGIN ? a.top - GAP - h : below;
    setPos({ top, left });
  }, [anchor]);

  useLayoutEffect(place, [place]);

  useEffect(() => {
    const close = onClose;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [anchor, onClose, place]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={(name ?? '가드레일') + ' 설명'}
      className={s.popover}
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden', top: 0, left: 0 }}
    >
      <div className={s.head}>
        <span className={s.layer}>{layer ? GUARD_LAYER[layer].label : '가드레일'}</span>
        <span className={`mono ${s.name}`}>{name ?? '-'}</span>
      </div>
      {info ? (
        <dl className={s.body}>
          <dt>검사</dt>
          <dd>{info.checks}</dd>
          <dt>막히면</dt>
          <dd>{info.onBlock}</dd>
        </dl>
      ) : (
        <p className={s.empty}>설명이 없는 검사예요.</p>
      )}
    </div>,
    document.body,
  );
}
