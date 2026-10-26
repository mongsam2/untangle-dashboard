import { expect, test } from 'vitest';
import { MOCK_RUNS } from '../../api/mock/fixtures';
import type { SessionDetailResponse } from '../../api/types';
import { sessionItem } from '../../api/mock/aggregate';
import { buildSessionTimeline, sessionViewAt, TURN_GAP_MS } from './sessionReplay';

function sessionOf(size: number): SessionDetailResponse {
  const bySession = new Map<string, typeof MOCK_RUNS>();
  for (const r of MOCK_RUNS) bySession.set(r.run.session_id, [...(bySession.get(r.run.session_id) ?? []), r]);
  const turns = [...bySession.values()].find((t) => t.length >= size && t.every((x) => x.response !== null))!;
  turns.sort((a, b) => a.run.started_at.localeCompare(b.run.started_at));
  return { session: sessionItem(turns.map((t) => t.run)), turns, omitted_turns: 0 };
}

test('턴은 앞 턴 끝 + 쉼 뒤에 시작하고 총 길이는 마지막 턴 끝이다', () => {
  const d = sessionOf(2);
  const tl = buildSessionTimeline(d);
  expect(tl.turns[0]!.offset).toBe(0);
  expect(tl.turns[1]!.offset).toBe(tl.turns[0]!.timeline.total + TURN_GAP_MS);
  expect(tl.total).toBe(tl.turns[tl.turns.length - 1]!.offset + tl.turns[tl.turns.length - 1]!.timeline.total);
});

test('첫 턴 재생 중에는 둘째 턴이 보이지 않고, 끝에서는 모든 턴의 채팅·단계가 쌓인다', () => {
  const d = sessionOf(2);
  const tl = buildSessionTimeline(d);
  const mid = sessionViewAt(d, tl, tl.turns[1]!.offset - 1);
  expect(mid.turnIndex).toBe(1);
  expect(mid.turnSteps.length).toBe(1);
  const end = sessionViewAt(d, tl, tl.total);
  expect(end.turnIndex).toBe(d.turns.length);
  expect(end.steps.length).toBe(d.turns.reduce((n, t) => n + t.steps.length, 0));
  expect(end.chat.filter((c) => c.kind === 'user').length).toBe(d.turns.length);
  expect(end.cumIn).toBe(d.turns.reduce((n, t) => n + t.run.input_tokens, 0));
  expect(end.ended).toBeTruthy();
});
