import { expect, test } from 'vitest';
import { guardrailInfo } from './guardrails';

test('탱글 서버가 남기는 가드레일 이름마다 설명이 있다', () => {
  const names = [
    ['input', 'target_ownership'],
    ['input', 'answer_bundle'],
    ['output', 'structure'],
    ['output', 'length'],
    ['output', 'references'],
    ['output', 'card_count'],
    ['output', 'missing_cards'],
    ['limit', 'time'],
    ['limit', 'model_turns'],
  ] as const;
  for (const [layer, name] of names) expect(guardrailInfo(layer, name), layer + '.' + name).not.toBeNull();
});

test('도구 검사는 도구 이름과 상관없이 인자·결과 설명을 쓴다', () => {
  expect(guardrailInfo('tool', 'search_todos.arguments')).toEqual(guardrailInfo('tool', 'propose_create.arguments'));
  expect(guardrailInfo('tool', 'search_todos.result')).not.toEqual(guardrailInfo('tool', 'search_todos.arguments'));
  expect(guardrailInfo('tool', 'search_todos')).toBeNull();
});

test('모르는 이름이나 빈 값은 설명이 없다', () => {
  expect(guardrailInfo('output', 'unknown')).toBeNull();
  expect(guardrailInfo(null, 'structure')).toBeNull();
  expect(guardrailInfo('output', null)).toBeNull();
});
