import { expect, test } from 'vitest';
import { MOCK_RUNS } from '../../api/mock/fixtures';
import { buildTimeline, responseLines, viewAt } from './replayModel';

const finished = MOCK_RUNS.find((r) => r.response !== null && r.steps.length > 3)!;
const unfinished = MOCK_RUNS.find((r) => r.response === null);

test('타임라인은 사용자 입력으로 시작해 단계 순서대로 늘어나고 최종 응답으로 끝난다', () => {
  const tl = buildTimeline(finished);
  expect(tl.beats[0]!.kind).toBe('user');
  expect(tl.beats[tl.beats.length - 1]!.kind).toBe('final');
  for (let i = 1; i < tl.beats.length; i++) expect(tl.beats[i]!.t >= tl.beats[i - 1]!.t).toBeTruthy();
  expect(tl.beats.filter((b) => b.kind === 'step').length).toBe(finished.steps.length);
  expect(tl.finished).toBeTruthy();
});

test('재생 위치 0에서는 입력만, 끝에서는 응답까지 보인다', () => {
  const tl = buildTimeline(finished);
  const start = viewAt(finished, tl, 0);
  expect(start.chat.length).toBe(1);
  expect(start.chat[0]!.kind).toBe('user');
  expect(start.steps.length).toBe(0);
  const end = viewAt(finished, tl, tl.total);
  expect(end.steps.length).toBe(finished.steps.length);
  expect(end.chat.length > 1).toBeTruthy();
  expect(end.typing).toBe(false);
  expect(end.ended).toBeTruthy();
  expect(end.cumIn).toBe(finished.run.input_tokens);
});

test('중간 위치에서는 지나간 단계만 드러나고 ··· 말풍선이 보인다', () => {
  const tl = buildTimeline(finished);
  const second = tl.beats.filter((b) => b.kind === 'step')[1]!;
  const v = viewAt(finished, tl, second.t);
  expect(v.steps.length).toBe(2);
  expect(v.typing).toBeTruthy();
  expect(v.chat.length).toBe(1);
});

test('끝나지 않은 실행은 최종 박자 없이 끝에서 안내 줄을 보인다', () => {
  if (!unfinished) throw new Error('예시 데이터에 끝나지 않은 실행이 있어야 한다');
  const tl = buildTimeline(unfinished);
  expect(tl.finished).toBe(false);
  const v = viewAt(unfinished, tl, tl.total);
  expect(v.typing).toBe(false);
  expect(v.chat[v.chat.length - 1]!.kind).toBe('system');
});

test('오류 응답은 오류 줄 하나로, 빈 응답은 상태 안내로 바뀐다', () => {
  const err = responseLines({ turn_id: 't', error: { code: 'model_unavailable', message: '잠시 뒤', retryable: true } }, 'error', 'x');
  expect(err.length).toBe(1);
  expect(err[0]!.kind).toBe('error');
  const empty = responseLines({ session_id: 's', turn_id: 't', response_id: 'r', answer: null, ask: null, information_cards: [] }, 'limit_exceeded', 'x');
  expect(empty[0]!.kind).toBe('system');
});
