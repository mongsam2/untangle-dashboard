import type { RunInput } from '../api/types';

const MENTION_RE = /\{\{task:([0-9a-fA-F-]{36})\}\}/g;

/** 사용자 발화. 답변 묶음 입력은 원문이 없어서 개수만 문장으로 보여준다. */
export function inputText(input: RunInput): string {
  if (input.kind === 'answers') return `(질문 ${input.answer_count ?? 0}개에 답함)`;
  return input.text ?? '';
}

/** 본문의 멘션 칩(`{{task:ID}}`)을 글자와 칩으로 나눈다. */
export function splitMentions(text: string): { kind: 'text' | 'mention'; value: string }[] {
  const out: { kind: 'text' | 'mention'; value: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: 'text', value: text.slice(last, at) });
    out.push({ kind: 'mention', value: m[1]! });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

/** 목록·제목용 한 줄 요약. 멘션은 `@항목`으로 줄인다. */
export function previewText(text: string): string {
  return text.replace(MENTION_RE, '@항목').replace(/\s+/g, ' ').trim();
}
