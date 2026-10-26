import type { KeyboardEvent } from 'react';
import { KIND } from '../../lib/kinds';
import s from './Architecture.module.css';
import { CANVAS, CHIP, EDGES, GATES, NODES, SERVER_REGION, SHELF, SHELF_GROUPS, SYNC_DIVIDER_Y, TOOL_CHIPS, type GateDef, type NodeDef, type Selected, type ToolDef } from './architectureModel';

interface DiagramProps {
  scale: number;
  selected: Selected | null;
  onSelect: (sel: Selected) => void;
}

const GATE_W = 14;
const GATE_H = 72;

// 구조도 본체. 선 → 영역 → 노드 순서로 그려 선이 블록 아래로 들어간다.
export function Diagram({ scale, selected, onSelect }: DiagramProps) {
  const is = (sel: Selected) => selected?.kind === sel.kind && selected.id === sel.id;
  const key = (sel: Selected) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(sel);
    }
  };
  return (
    <svg className={s.canvas} width={CANVAS.width * scale} height={CANVAS.height * scale} viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`} role="img" aria-label="탱글 에이전트 구조도">
      <defs>
        <pattern id="barricade" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="var(--guard-stripe-light)" />
          <rect width="6" height="12" fill="var(--guard-stripe-dark)" />
        </pattern>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--line-connector)" />
        </marker>
        <marker id="arrowMain" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--icon-primary)" />
        </marker>
      </defs>

      {/* 탱글 서버 영역과 동기화 레인 */}
      <rect className={s.region} x={SERVER_REGION.x} y={SERVER_REGION.y} width={SERVER_REGION.w} height={SERVER_REGION.h} rx="20" />
      <text className={s.regionLabel} x={SERVER_REGION.x + 24} y={SERVER_REGION.y + 34}>
        탱글 서버
      </text>
      <line className={s.divider} x1={SERVER_REGION.x + 24} x2={SERVER_REGION.x + SERVER_REGION.w - 24} y1={SYNC_DIVIDER_Y} y2={SYNC_DIVIDER_Y} />
      <g>
        <rect x={SERVER_REGION.x + 24} y={SYNC_DIVIDER_Y - 14} width="196" height="28" rx="14" fill="var(--surface-field)" stroke="var(--border-subtle)" />
        <text className={s.groupTitle} x={SERVER_REGION.x + 24 + 98} y={SYNC_DIVIDER_Y + 4} textAnchor="middle">
          채팅과 별도 흐름 · 동기화
        </text>
      </g>

      {/* 도구 선반 */}
      <rect className={s.shelfBox} x={SHELF.x} y={SHELF.y} width={SHELF.w} height={SHELF.h} rx="16" />
      <text className={s.overline} x={SHELF.x + 20} y={SHELF.y + 32}>
        도구 선반
      </text>
      <text className={s.label} x={SHELF.x + 20} y={SHELF.y + 58}>
        모델이 골라 쓰는 도구 12개
      </text>
      {SHELF_GROUPS.map((g) => (
        <g key={g.kind}>
          <circle cx={g.x + 5} cy={g.y - 4} r="5" fill={KIND[g.kind].color} />
          <text className={s.groupTitle} x={g.x + 16} y={g.y}>
            {g.title}
          </text>
        </g>
      ))}

      {/* 선 */}
      {EDGES.map((e) => (
        <path
          key={e.id}
          className={`${s.edge} ${e.main ? s.edgeMain : ''} ${e.dashed ? s.edgeDashed : ''}`}
          d={e.d}
          markerEnd={e.arrow ? `url(#${e.main ? 'arrowMain' : 'arrow'})` : undefined}
        />
      ))}

      {/* 노드 */}
      {NODES.map((n) => (
        <NodeView key={n.id} node={n} selected={is({ kind: 'node', id: n.id })} onSelect={() => onSelect({ kind: 'node', id: n.id })} onKey={key({ kind: 'node', id: n.id })} />
      ))}

      {/* 도구 칩 */}
      {TOOL_CHIPS.map((t) => (
        <ChipView key={t.name} tool={t} selected={is({ kind: 'tool', id: t.name })} onSelect={() => onSelect({ kind: 'tool', id: t.name })} onKey={key({ kind: 'tool', id: t.name })} />
      ))}

      {/* 가드레일 차단봉 */}
      {GATES.map((g) => (
        <GateView key={g.id} gate={g} selected={is({ kind: 'gate', id: g.id })} onSelect={() => onSelect({ kind: 'gate', id: g.id })} onKey={key({ kind: 'gate', id: g.id })} />
      ))}
    </svg>
  );
}

interface ElementProps {
  selected: boolean;
  onSelect: () => void;
  onKey: (e: KeyboardEvent) => void;
}

function NodeView({ node, selected, onSelect, onKey }: ElementProps & { node: NodeDef }) {
  const cx = node.x + node.w / 2;
  const boxClass = node.variant === 'app' ? s.nodeApp : node.variant === 'hub' ? s.nodeHub : node.variant === 'db' ? s.nodeDb : s.nodeBox;
  const inverse = node.variant === 'hub';
  return (
    <g className={s.clickable} role="button" tabIndex={0} aria-label={node.label + ' 설명 보기'} onClick={onSelect} onKeyDown={onKey}>
      {node.variant === 'db' ? (
        <>
          <rect className={`${s.nodeDb} ${selected ? s.selected : ''}`} x={node.x} y={node.y + 14} width={node.w} height={node.h - 14} rx="12" />
          <ellipse className={s.nodeDb} cx={cx} cy={node.y + 14} rx={node.w / 2} ry="14" />
        </>
      ) : (
        <rect className={`${boxClass} ${selected ? s.selected : ''}`} x={node.x} y={node.y} width={node.w} height={node.h} rx={node.variant === 'app' ? 32 : node.variant === 'hub' ? 20 : 12} />
      )}
      {node.variant === 'app' && (
        <>
          <rect x={cx - 36} y={node.y + 22} width="72" height="8" rx="4" fill="var(--line-hierarchy)" />
          <rect x={node.x + 20} y={node.y + 54} width={node.w - 40} height={node.h - 76} rx="16" fill="var(--surface-field)" stroke="var(--border-subtle)" />
          <AppSketch x={node.x + 20} y={node.y + 54} w={node.w - 40} />
        </>
      )}
      {node.variant === 'hub' && <HubSketch node={node} />}
      {node.overline && (
        <text className={s.overline} x={node.x + (inverse ? 24 : 20)} y={node.y + (inverse ? 36 : 28)} style={inverse ? { fill: '#a9c4f5' } : undefined}>
          {node.overline}
        </text>
      )}
      <NodeLabel node={node} />
    </g>
  );
}

function NodeLabel({ node }: { node: NodeDef }) {
  const cx = node.x + node.w / 2;
  switch (node.variant) {
    case 'app':
      return (
        <text className={s.label} x={cx} y={node.y + node.h + 30} textAnchor="middle">
          {node.label}
        </text>
      );
    case 'hub':
      return (
        <text className={`${s.label} ${s.labelInverse}`} x={node.x + 24} y={node.y + 66}>
          {node.label}
        </text>
      );
    case 'db':
      return (
        <text className={s.label} x={cx} y={node.y + node.h / 2 + 14} textAnchor="middle">
          {node.label}
        </text>
      );
    default:
      return (
        <text className={s.label} x={node.x + 20} y={node.y + 58}>
          {node.label}
        </text>
      );
  }
}

/** 앱 화면 스케치: 말풍선 두 개와 카드 하나. 글은 없다. */
function AppSketch({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x + 16} y={y + 24} width={w - 60} height="30" rx="12" fill="var(--surface-document)" stroke="var(--border-subtle)" />
      <rect x={x + 44} y={y + 68} width={w - 60} height="30" rx="12" fill="var(--surface-action)" />
      <rect x={x + 16} y={y + 112} width={w - 60} height="30" rx="12" fill="var(--surface-document)" stroke="var(--border-subtle)" />
      <rect x={x + 16} y={y + 160} width={w - 32} height="118" rx="12" fill="var(--surface-document)" stroke="var(--border-subtle)" />
      <rect x={x + 28} y={y + 174} width="56" height="12" rx="6" fill="var(--surface-warning)" />
      <rect x={x + 28} y={y + 196} width={w - 56} height="10" rx="5" fill="var(--line-hierarchy)" />
      <rect x={x + 28} y={y + 214} width={w - 90} height="10" rx="5" fill="var(--border-subtle)" />
      <rect x={x + 28} y={y + 248} width={(w - 68) / 2} height="18" rx="6" fill="var(--surface-action)" />
      <rect x={x + 36 + (w - 68) / 2} y={y + 248} width={(w - 68) / 2} height="18" rx="6" fill="var(--surface-field)" stroke="var(--border-subtle)" />
      <rect x={x + 16} y={y + 300} width={w - 32} height="36" rx="18" fill="var(--surface-document)" stroke="var(--border-subtle)" />
      <circle cx={x + w - 34} cy={y + 318} r="12" fill="var(--surface-action)" />
    </g>
  );
}

/** AI 모델 블록 안: 들어오는 쪽(왼쪽)과 나가는 쪽(오른쪽·아래)을 점으로만 표시한다. */
function HubSketch({ node }: { node: NodeDef }) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2 + 40;
  return (
    <g aria-hidden="true">
      <circle cx={cx} cy={cy} r="54" fill="none" stroke="#a9c4f5" strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="34" fill="none" stroke="#a9c4f5" strokeOpacity="0.8" strokeWidth="1.5" />
      <path d={`M${cx - 12} ${cy - 12}l12 -14 12 14 -8 0 0 26 -8 0 0 -26z`} fill="var(--surface-document)" />
    </g>
  );
}

function ChipView({ tool, selected, onSelect, onKey }: ElementProps & { tool: ToolDef }) {
  return (
    <g className={s.clickable} role="button" tabIndex={0} aria-label={tool.name + ' 설명 보기'} onClick={onSelect} onKeyDown={onKey}>
      <rect className={`${s.chipBox} ${selected ? s.selected : ''}`} x={tool.x} y={tool.y} width={CHIP.w} height={CHIP.h} rx="10" />
      <rect x={tool.x} y={tool.y + 8} width="4" height={CHIP.h - 16} rx="2" fill={KIND[tool.kind].color} />
      <text className={s.mono} x={tool.x + 16} y={tool.y + 25} fill="var(--text-primary)">
        {tool.name}
      </text>
    </g>
  );
}

function GateView({ gate, selected, onSelect, onKey }: ElementProps & { gate: GateDef }) {
  const ly = gate.labelSide === 'above' ? gate.y - GATE_H / 2 - 14 : gate.y + GATE_H / 2 + 24;
  return (
    <g className={s.clickable} role="button" tabIndex={0} aria-label={gate.label + ' 기준 보기'} onClick={onSelect} onKeyDown={onKey}>
      <rect x={gate.x - GATE_W / 2 - 6} y={gate.y - GATE_H / 2 - 6} width={GATE_W + 12} height={GATE_H + 12} rx="6" fill="var(--surface-field)" stroke={selected ? 'var(--border-focus)' : 'var(--border-subtle)'} strokeWidth={selected ? 2.5 : 1.5} />
      <rect className={s.gateBar} x={gate.x - GATE_W / 2} y={gate.y - GATE_H / 2} width={GATE_W} height={GATE_H} rx="3" fill="url(#barricade)" />
      <text className={s.gateLabel} x={gate.x} y={ly} textAnchor="middle">
        {gate.label}
      </text>
    </g>
  );
}
