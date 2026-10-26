import type { Item, Operation, Proposal, ProposalType } from '../api/types';
import { fmtMinutes, fmtWall } from './format';

/** 제안 카드 8종의 표기. 종류 뒤의 동작 이름은 앱의 카드 머리와 같다. */
export const PROPOSAL_TYPE: Record<ProposalType, { label: string; verb: string; category: '할 일' | '계획' }> = {
  create_todo: { label: '할 일 생성', verb: '새로 만들기', category: '할 일' },
  update_todo: { label: '할 일 변경', verb: '바꾸기', category: '할 일' },
  delete_todo: { label: '할 일 삭제', verb: '지우기', category: '할 일' },
  move_todo_to_plan: { label: '계획으로 이동', verb: '계획으로 옮기기', category: '할 일' },
  create_plan: { label: '계획 생성', verb: '새로 만들기', category: '계획' },
  update_plan: { label: '계획 변경', verb: '바꾸기', category: '계획' },
  delete_plan: { label: '계획 삭제', verb: '지우기', category: '계획' },
  move_plan_to_todo: { label: '할 일로 이동', verb: '할 일로 옮기기', category: '계획' },
};

export interface DiffLine {
  field: string;
  before: string | null;
  after: string | null;
}

const show = (v: string | number | null | undefined, empty = '없음'): string => (v == null || v === '' ? empty : String(v));

function fieldLines(before: Item | null, after: Item | null): DiffLine[] {
  const lines: DiffLine[] = [];
  const push = (field: string, b: string | null, a: string | null) => {
    if (b !== a) lines.push({ field, before: b, after: a });
  };
  push('종류', before ? (before.category === 'todo' ? '할 일' : '계획') : null, after ? (after.category === 'todo' ? '할 일' : '계획') : null);
  push('제목', before?.title ?? null, after?.title ?? null);
  push('예상 시간', before ? fmtMinutes(before.estimated_minutes) : null, after ? fmtMinutes(after.estimated_minutes) : null);
  push('메모', before ? show(before.memo) : null, after ? show(after.memo) : null);
  push('일정', before ? (fmtWall(before.date, before.time) ?? '없음') : null, after ? (fmtWall(after.date, after.time) ?? '없음') : null);
  push(
    '알림',
    before ? (before.reminder_minutes_before == null ? '없음' : before.reminder_minutes_before + '분 전') : null,
    after ? (after.reminder_minutes_before == null ? '없음' : after.reminder_minutes_before + '분 전') : null,
  );
  return lines;
}

export interface SubtaskLine {
  title: string;
  state: 'kept' | 'new' | 'removed' | 'renamed';
  from?: string;
  done: boolean;
}

/** 최종 하위 목록을 기준으로 새로·제거·제목 변경을 표시한다. 기존 ID가 같으면 같은 하위 작업이다. */
export function subtaskLines(before: Item | null, after: Item | null): SubtaskLine[] {
  const prev = before?.subtasks ?? [];
  const next = after?.subtasks ?? [];
  const out: SubtaskLine[] = next.map((s) => {
    const was = s.id ? prev.find((p) => p.id === s.id) : undefined;
    if (!was) return { title: s.title, state: 'new', done: s.is_completed };
    if (was.title !== s.title) return { title: s.title, state: 'renamed', from: was.title, done: s.is_completed };
    return { title: s.title, state: 'kept', done: s.is_completed };
  });
  for (const p of prev) if (!next.some((s) => s.id === p.id)) out.push({ title: p.title, state: 'removed', done: p.is_completed });
  return out;
}

export interface ProposalView {
  type: ProposalType;
  label: string;
  /** 카드 제목. 제목이 바뀌어도 이전 이름을 유지한다. */
  title: string;
  lines: DiffLine[];
  subtasks: SubtaskLine[];
  operations: string[];
}

export function operationLabel(op: Operation): string {
  switch (op.op) {
    case 'create':
      return 'create · 새 항목 저장';
    case 'move':
      return 'move · ' + (op.category === 'plan' ? '계획으로' : '할 일로') + (op.date ? ' ' + (fmtWall(op.date, op.time) ?? '') : '');
    case 'update':
      return 'update · ' + op.changes.map((c) => c.field).join(', ');
    case 'set_subtasks':
      return 'set_subtasks · ' + op.subtasks.length + '개';
    case 'delete':
      return 'delete';
  }
}

export function proposalView(p: Proposal): ProposalView {
  const { before, after } = p.content;
  const lines = fieldLines(before, after).filter((l) => !(p.proposal_type.startsWith('create') && l.after === '없음'));
  return {
    type: p.proposal_type,
    label: PROPOSAL_TYPE[p.proposal_type].label,
    title: before?.title ?? after?.title ?? '(제목 없음)',
    lines: p.proposal_type.startsWith('delete') ? [] : lines,
    subtasks: subtaskLines(before, after),
    operations: p.content.operations.map(operationLabel),
  };
}
