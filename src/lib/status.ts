import type { CSSProperties } from 'react';
import type { RunSource, RunStatus } from '../api/types';

export interface Tone {
  label: string;
  bg: string;
  fg: string;
  dot: string;
}

const tone = (label: string, key: string): Tone => ({
  label,
  bg: `var(--status-${key}-bg)`,
  fg: `var(--status-${key}-fg)`,
  dot: `var(--status-${key}-dot)`,
});

/** 실행 상태 6종의 표기와 색. 순서는 필터·범례·비율 막대가 같이 쓴다. */
export const RUN_STATUS: Record<RunStatus, Tone> = {
  normal: tone('정상', 'normal'),
  tool_failed: tone('도구 실패', 'tool-failed'),
  blocked_input: tone('입력 차단', 'blocked-input'),
  limit_exceeded: tone('한도 초과', 'limit-exceeded'),
  output_rejected: tone('출력 거부', 'output-rejected'),
  error: tone('서버 오류', 'error'),
};

export const RUN_STATUS_ORDER: RunStatus[] = ['normal', 'tool_failed', 'blocked_input', 'limit_exceeded', 'output_rejected', 'error'];

/** 상태를 짧게 설명하는 문장. 필터 패널과 상세 머리에 보인다. */
export const RUN_STATUS_HINT: Record<RunStatus, string> = {
  normal: '가드레일을 모두 통과하고 응답을 보냈어요.',
  tool_failed: '도구가 오류를 돌려줬어요. 응답은 그 사실을 알립니다.',
  blocked_input: '입력 가드레일에서 막혀 모델을 부르지 않았어요.',
  limit_exceeded: '시간·왕복·출력 한도를 넘어 카드 없이 고정 안내로 끝났어요.',
  output_rejected: '보정 1회 뒤에도 출력 검증을 통과하지 못했어요.',
  error: '모델·DB 장애나 서버 오류로 응답을 만들지 못했어요.',
};

const NEUTRAL: Tone = { label: '', bg: 'var(--surface-field)', fg: 'var(--text-primary)', dot: 'var(--line-connector)' };
const FAIL: Tone = { label: '실패', bg: 'var(--surface-danger)', fg: 'var(--text-danger)', dot: 'var(--data-failure)' };
const OK: Tone = { label: '성공', bg: 'var(--surface-success)', fg: 'var(--text-success)', dot: 'var(--data-success)' };

export function toolTone(status: string | null | undefined): Tone {
  if (status === 'success') return OK;
  if (status === 'failed') return FAIL;
  return { ...NEUTRAL, label: status ?? '-' };
}

export function guardTone(passed: boolean | null | undefined): Tone {
  if (passed === false) return { ...FAIL, label: '차단' };
  return { label: '통과', bg: 'var(--surface-field)', fg: 'var(--text-secondary)', dot: 'var(--data-success)' };
}

export function isFailure(status: string | null | undefined): boolean {
  return status === 'failed';
}

// 표 행 배경. 정상은 색을 입히지 않고 문제가 있는 요청만 연하게 칠한다.
export const ROW_TINT: Record<RunStatus, string> = {
  normal: '',
  tool_failed: 'var(--row-tint-tool-failed)',
  blocked_input: 'var(--row-tint-blocked-input)',
  limit_exceeded: 'var(--row-tint-limit-exceeded)',
  output_rejected: 'var(--row-tint-output-rejected)',
  error: 'var(--row-tint-error)',
};

export function rowStyleOf(status: RunStatus, selected: boolean): CSSProperties {
  const bg = ROW_TINT[status] || (selected ? 'var(--surface-field)' : '');
  const style: CSSProperties = {};
  if (bg) style.background = bg;
  if (selected) style.boxShadow = 'inset 3px 0 0 var(--border-focus)';
  return style;
}

export type RowSource = Exclude<RunSource, 'all'>;

export const SOURCE: Record<RowSource, { label: string; bg: string; fg: string; border: string }> = {
  test: { label: '테스트', bg: 'var(--surface-document)', fg: 'var(--text-primary)', border: 'var(--line-hierarchy)' },
  real: { label: '실제 요청', bg: 'var(--surface-inverse)', fg: 'var(--text-inverse)', border: 'var(--surface-inverse)' },
};

export function sourceOf(testCaseId: string | null): RowSource {
  return testCaseId ? 'test' : 'real';
}

/** 응답의 후속 입력 종류 표기. */
export function askLabel(askType: 'question' | 'proposal' | null, questions: number, proposals: number): string {
  if (askType === 'question') return '질문 ' + questions;
  if (askType === 'proposal') return '제안 ' + proposals;
  return '답변';
}
