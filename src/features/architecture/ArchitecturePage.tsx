import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ShieldIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { StepIcon } from '../../components/StepIcon';
import { KIND } from '../../lib/kinds';
import s from './Architecture.module.css';
import { CANVAS, docOf, GATES, NODES, TOOL_CHIPS, TOUR, tourIndex, type Selected } from './architectureModel';
import { Diagram } from './Diagram';

const ZOOM_MIN = 0.35;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 1.2;

// 구조 탭. 사방으로 스크롤되는 캔버스에 구조도를 넓게 펼치고, 모듈을 누르면 가운데 설명 창이 열린다.
export function ArchitecturePage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.72);
  const [selected, setSelected] = useState<Selected | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // 처음에는 구조도 가운데가 보이게 스크롤을 맞춘다.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, (CANVAS.width * scale - el.clientWidth) / 2);
    el.scrollTop = Math.max(0, (CANVAS.height * scale - el.clientHeight) / 2);
    // 처음 한 번만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomTo = useCallback((next: number) => {
    const el = scrollRef.current;
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    setScale((prev) => {
      if (el) {
        // 화면 가운데를 기준으로 확대·축소한다.
        const cx = (el.scrollLeft + el.clientWidth / 2) / prev;
        const cy = (el.scrollTop + el.clientHeight / 2) / prev;
        requestAnimationFrame(() => {
          el.scrollLeft = cx * clamped - el.clientWidth / 2;
          el.scrollTop = cy * clamped - el.clientHeight / 2;
        });
      }
      return clamped;
    });
  }, []);

  const fit = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const next = Math.min((el.clientWidth - 48) / CANVAS.width, (el.clientHeight - 48) / CANVAS.height);
    zoomTo(next);
  }, [zoomTo]);

  // Ctrl/⌘ + 휠로 확대·축소. 일반 휠은 스크롤에 맡긴다.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(scale * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scale, zoomTo]);

  const onMouseDown = (e: ReactMouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('[role="button"]')) return;
    const el = scrollRef.current!;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    setDragging(true);
  };
  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => {
      const d = drag.current;
      const el = scrollRef.current;
      if (!d || !el) return;
      el.scrollLeft = d.left - (e.clientX - d.x);
      el.scrollTop = d.top - (e.clientY - d.y);
    };
    const up = () => {
      drag.current = null;
      setDragging(false);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [dragging]);

  const close = useCallback(() => setSelected(null), []);
  const step = (dir: 1 | -1) => {
    if (!selected) return;
    const i = tourIndex(selected);
    const next = TOUR[(i + dir + TOUR.length) % TOUR.length]!;
    setSelected(next);
  };

  return (
    <div className={s.root}>
      <div ref={scrollRef} className={`${s.scroll} ${dragging ? s.scrollDragging : ''}`} onMouseDown={onMouseDown}>
        <Diagram scale={scale} selected={selected} onSelect={setSelected} />
      </div>

      <section className={`${s.float} ${s.titleCard}`} aria-label="구조도 소개">
        <span className={s.title}>탱글 에이전트 구조</span>
        <span className={s.subtitle}>요청은 위로 들어가 AI 모델에 닿고, 응답은 아래로 앱에 돌아옵니다. 블록·도구·차단봉을 누르면 설명이 열려요.</span>
      </section>

      <div className={`${s.float} ${s.legend}`} aria-label="범례">
        <span className={s.legendItem}>
          <span className={`stripes ${s.legendBar}`} aria-hidden="true" />
          가드레일
        </span>
        <span className={s.legendItem}>
          <span className={s.legendLine} aria-hidden="true" />
          요청·응답
        </span>
        <span className={s.legendItem}>
          <span className={`${s.legendLine} ${s.legendLineThin}`} aria-hidden="true" />
          도구
        </span>
        <span className={s.legendItem}>
          <span className={`${s.legendLine} ${s.legendLineDashed}`} aria-hidden="true" />
          동기화
        </span>
        <span>드래그로 이동 · Ctrl+휠로 확대</span>
      </div>

      <div className={`${s.float} ${s.zoom}`} role="group" aria-label="확대·축소">
        <Button variant="soft" aria-label="축소" onClick={() => zoomTo(scale / ZOOM_STEP)}>
          −
        </Button>
        <span className={`mono ${s.zoomValue}`}>{Math.round(scale * 100)}%</span>
        <Button variant="soft" aria-label="확대" onClick={() => zoomTo(scale * ZOOM_STEP)}>
          +
        </Button>
        <Button variant="soft" onClick={fit}>
          전체 보기
        </Button>
      </div>

      {selected && <DocModal selected={selected} onClose={close} onPrev={() => step(-1)} onNext={() => step(1)} />}
    </div>
  );
}

function iconOf(sel: Selected) {
  if (sel.kind === 'gate') return <StepIcon kind="guardrail" size={40} />;
  if (sel.kind === 'tool') return <StepIcon kind={TOOL_CHIPS.find((t) => t.name === sel.id)!.kind} size={40} />;
  return <StepIcon kind={sel.id === 'model' ? 'model' : sel.id === 'app' ? 'user' : 'server'} size={40} />;
}

function tagsOf(sel: Selected) {
  if (sel.kind === 'gate') {
    const g = GATES.find((x) => x.id === sel.id)!;
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Badge bg="var(--guard-bg)" fg="var(--guard-fg)">
          <ShieldIcon /> 차단봉
        </Badge>
        <Badge ring>{g.label}</Badge>
      </div>
    );
  }
  if (sel.kind === 'tool') {
    const t = TOOL_CHIPS.find((x) => x.name === sel.id)!;
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Badge bg={KIND[t.kind].bg} fg={KIND[t.kind].color}>
          {KIND[t.kind].label}
        </Badge>
        <Badge ring>{t.label}</Badge>
      </div>
    );
  }
  const n = NODES.find((x) => x.id === sel.id)!;
  return <Badge ring>{n.variant === 'app' ? '앱' : n.variant === 'db' ? '저장소' : '탱글 서버'}</Badge>;
}

function DocModal({ selected, onClose, onPrev, onNext }: { selected: Selected; onClose: () => void; onPrev: () => void; onNext: () => void }) {
  const doc = docOf(selected);
  const i = tourIndex(selected);
  return (
    <Modal
      overline={doc.overline}
      title={doc.title}
      icon={iconOf(selected)}
      tags={tagsOf(selected)}
      side={
        <>
          {doc.side.map((x) => (
            <div key={x.label} className={s.sideItem}>
              <span className={s.sideLabel}>{x.label}</span>
              <span className={s.sideValue}>{x.value}</span>
            </div>
          ))}
        </>
      }
      footer={
        <div className={s.footerNav}>
          <span className={s.source}>설계 문서 · {doc.source}</span>
          <Button onClick={onPrev}>‹ 이전</Button>
          <span className={`mono ${s.sideLabel}`}>
            {i + 1} / {TOUR.length}
          </span>
          <Button onClick={onNext}>다음 ›</Button>
          <Button variant="primary" onClick={onClose}>
            닫기
          </Button>
        </div>
      }
      onClose={onClose}
    >
      <p className={s.docSummary}>{doc.summary}</p>
      <div className={s.docPoints}>
        {doc.points.map((p) => (
          <div key={p.head} className={s.docPoint}>
            <span className={s.docHead}>{p.head}</span>
            <span className={s.docBody}>{p.body}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
