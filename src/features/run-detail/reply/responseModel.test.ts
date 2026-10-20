import { describe, expect, it } from 'vitest';
import { MOCK_RUNS } from '../../../api/mock/fixtures';
import { isErrorResponse, type ChatResponse, type ErrorResponse, type NoteState } from '../../../api/types';
import { chatOf, errorOf, noteStateRows, outcomeCounts, rejectedOf } from './responseModel';

const byCase = (id: string) => MOCK_RUNS.find((d) => d.run.test_case_id === id)!;
const chat = (extra: Partial<ChatResponse> = {}): ChatResponse => ({ turn_id: 't-1', message: '답변', ...extra });
const plainError: ErrorResponse = { turn_id: 't-2', error: { code: 'conflict', message: '이 대화의 이전 요청이 처리 중이에요.', retryable: false } };

describe('응답 종류', () => {
  it('error 키가 아니라 message로 대화 응답과 오류 응답을 가른다', () => {
    // 서버는 ChatResponse에도 error: null을 싣는다. 이것을 오류 응답으로 읽으면 안 된다.
    expect(isErrorResponse(chat({ error: null }))).toBe(false);
    expect(isErrorResponse(plainError)).toBe(true);
    expect(isErrorResponse(null)).toBe(false);
    expect(chatOf(chat({ error: null }))).not.toBeNull();
    expect(chatOf(plainError)).toBeNull();
    expect(chatOf(null)).toBeNull();
  });

  it('error는 오류 응답과, 답변이 실패했지만 결과가 남은 대화 응답에서 읽는다', () => {
    expect(errorOf(plainError)).toMatchObject({ code: 'conflict' });
    expect(errorOf(chat({ error: null }))).toBeNull();
    expect(errorOf(null)).toBeNull();
    const timeout = MOCK_RUNS.find((d) => d.run.status === 'error' && d.response && !isErrorResponse(d.response))!;
    const res = chatOf(timeout.response)!;
    expect(errorOf(res)).toMatchObject({ code: 'execution_timeout', retryable: false });
    expect(res.message).toBe(res.error!.message);
    expect(res.operations).toMatchObject([{ action: 'set_schedule', status: 'applied' }]);
    expect(timeout.steps.some((s) => s.tool_name === 'set_schedule' && s.tool_kind === 'mutation')).toBe(true);
  });
});

describe('사용자 변경 결과', () => {
  const t21 = chatOf(byCase('T21').response)!;

  it('상태별 건수는 고정 순서로, 없는 상태는 뺀다', () => {
    expect(outcomeCounts(t21.mutation_results ?? [])).toEqual([
      { status: 'superseded', count: 1 },
      { status: 'rejected', count: 1 },
    ]);
    const id = (n: number) => '00000000-0000-4000-8000-00000000000' + n;
    expect(
      outcomeCounts([
        { mutation_id: id(1), status: 'rejected' },
        { mutation_id: id(2), status: 'applied' },
        { mutation_id: id(3), status: 'applied' },
        { mutation_id: id(4), status: 'unchanged' },
      ]),
    ).toEqual([
      { status: 'applied', count: 2 },
      { status: 'unchanged', count: 1 },
      { status: 'rejected', count: 1 },
    ]);
    expect(outcomeCounts([])).toEqual([]);
  });

  it('거절된 변경은 반영하지 않은 이유와 함께 나온다', () => {
    expect(rejectedOf(t21.mutation_results ?? [])).toEqual([
      { mutationId: '2f7a9d14-e5c3-4086-b1a2-84d6c0e93f57', code: 'unsupported_operation', message: '지금은 목표의 시작 시각 기준 알림만 설정할 수 있어요.' },
    ]);
    // error가 빠진 거절도 줄은 남긴다.
    expect(rejectedOf([{ mutation_id: 'm', status: 'rejected' }])).toEqual([{ mutationId: 'm', code: '-', message: '이유가 기록되지 않았어요.' }]);
    expect(rejectedOf([{ mutation_id: 'm', status: 'applied' }])).toEqual([]);
  });
});

describe('노트 상태', () => {
  it('목표 제목과 목표 버전, 삭제 표식을 센다', () => {
    const rows = noteStateRows(chatOf(byCase('T24').response)!.note_states ?? []);
    expect(rows).toEqual([{ goalId: 'g-3', title: '토익 850점 받기', revision: 7, challenges: 3, deletedChallenges: 0, goalDeleted: false }]);

    const state: NoteState = {
      revision: 9,
      goal: { ...chatOf(byCase('T24').response)!.note_states![0]!.goal, deleted_at: '2026-10-19T20:00:00+09:00' },
      challenges: [
        { id: 'c-1', goal_id: 'g-3', title: '살아 있는 과제', category: null, sort_order: 1, origin: 'user', status: 'incomplete', created_at: '2026-10-19T09:00:00+09:00' },
        { id: 'c-2', goal_id: 'g-3', title: '지운 과제', category: 'start', sort_order: 2, origin: 'agent', status: 'deleted', created_at: '2026-10-19T09:00:00+09:00', deleted_at: '2026-10-19T10:00:00+09:00' },
      ],
    };
    expect(noteStateRows([state])[0]).toMatchObject({ revision: 9, challenges: 1, deletedChallenges: 1, goalDeleted: true });
    expect(noteStateRows([])).toEqual([]);
  });
});
