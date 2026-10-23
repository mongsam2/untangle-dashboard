import { describe, expect, it } from 'vitest';
import type { Item, Proposal } from '../api/types';
import { operationLabel, proposalView, subtaskLines } from './proposal';

const base: Item = { id: 'a', category: 'todo', title: '보고서 초안', is_completed: false, estimated_minutes: 120, memo: null, date: null, time: null, reminder_minutes_before: null, subtasks: [{ id: 's1', title: '자료 모으기', is_completed: true }, { id: 's2', title: '목차 잡기', is_completed: false }] };

describe('proposalView', () => {
  it('이동 카드는 종류와 일정 변화만 줄로 보여준다', () => {
    const after: Item = { ...base, category: 'plan', date: '2026-10-24', time: '10:00' };
    const p: Proposal = { proposal_id: 'p', proposal_type: 'move_todo_to_plan', target_item_id: 'a', content: { before: base, after, operations: [{ op: 'move', category: 'plan', date: '2026-10-24', time: '10:00', reminder_minutes_before: null }] } };
    const v = proposalView(p);
    expect(v.title).toBe('보고서 초안');
    expect(v.lines.map((l) => l.field)).toEqual(['종류', '일정']);
    expect(v.lines[1]).toEqual({ field: '일정', before: '없음', after: '10월 24일 10:00' });
    expect(v.operations).toEqual(['move · 계획으로 10월 24일 10:00']);
  });

  it('제목이 바뀌어도 카드 제목은 이전 이름이다', () => {
    const after: Item = { ...base, title: '보고서 최종본' };
    const v = proposalView({ proposal_id: 'p', proposal_type: 'update_todo', target_item_id: 'a', content: { before: base, after, operations: [{ op: 'update', changes: [{ field: 'title', value: '보고서 최종본' }] }] } });
    expect(v.title).toBe('보고서 초안');
    expect(v.lines).toEqual([{ field: '제목', before: '보고서 초안', after: '보고서 최종본' }]);
  });

  it('생성 카드는 값이 없는 줄을 빼고, 삭제 카드는 줄이 없다', () => {
    const after: Item = { ...base, id: null, estimated_minutes: null, subtasks: [] };
    const created = proposalView({ proposal_id: 'p', proposal_type: 'create_todo', target_item_id: null, content: { before: null, after, operations: [{ op: 'create', item: after }] } });
    expect(created.lines.map((l) => l.field)).toEqual(['종류', '제목', '예상 시간']);
    const deleted = proposalView({ proposal_id: 'p', proposal_type: 'delete_todo', target_item_id: 'a', content: { before: base, after: null, operations: [{ op: 'delete' }] } });
    expect(deleted.lines).toEqual([]);
    expect(deleted.operations).toEqual(['delete']);
  });

  it('하위 작업은 기존 ID로 유지·제목 변경·새로·제거를 가른다', () => {
    const after: Item = { ...base, subtasks: [{ id: 's1', title: '자료 정리', is_completed: true }, { id: null, title: '초안 쓰기', is_completed: false }] };
    expect(subtaskLines(base, after)).toEqual([
      { title: '자료 정리', state: 'renamed', from: '자료 모으기', done: true },
      { title: '초안 쓰기', state: 'new', done: false },
      { title: '목차 잡기', state: 'removed', done: false },
    ]);
    expect(operationLabel({ op: 'set_subtasks', subtasks: [{ subtask_id: 's1', title: '자료 정리' }] })).toBe('set_subtasks · 1개');
  });
});
