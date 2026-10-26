import type { AgentStep, RunListItem } from '../../api/types';

/** 화면에 쓰는 단계. 모델 호출에는 몇 번째 호출인지 붙인다. */
export interface DisplayStep extends AgentStep {
  modelIndex: number;
}

export function displaySteps(_run: RunListItem, steps: AgentStep[]): DisplayStep[] {
  let m = 0;
  return [...steps]
    .sort((a, b) => a.seq - b.seq)
    .map((s) => {
      if (s.kind === 'model') m += 1;
      return { ...s, modelIndex: s.kind === 'model' ? m : 0 };
    });
}

export function modelSteps(steps: DisplayStep[]): DisplayStep[] {
  return steps.filter((s) => s.kind === 'model');
}

/** 추론 요약. 한국어 번역본이 있으면 그것을, 없으면 원문을 보여준다. */
export function summaryText(step: AgentStep): string {
  return step.reasoning_summary_ko || step.reasoning_summary || '(추론 요약 없음)';
}

export function tokensOf(step: AgentStep): { fresh: number; cached: number; answer: number; reasoning: number } {
  const input = step.input_tokens ?? 0;
  const cached = step.cached_tokens ?? 0;
  const output = step.output_tokens ?? 0;
  const reasoning = step.reasoning_tokens ?? 0;
  return { fresh: input - cached, cached, answer: output - reasoning, reasoning };
}

/** 도구 오류 메시지. 결과의 `error.message`를 쓰고 없으면 코드만 보인다. */
export function errorMessageOf(step: AgentStep): string {
  const r = step.result as { error?: { message?: string; field_errors?: { path: string; message: string }[] } } | null;
  const base = r?.error?.message ?? '';
  const fields = r?.error?.field_errors?.map((f) => f.path + ': ' + f.message) ?? [];
  return [base, ...fields].filter(Boolean).join(' · ') || (step.error_code ?? '실패');
}

/** 가드레일 차단·도구 실패처럼 눈에 띄어야 하는 단계인지. */
export function isAttention(step: AgentStep): boolean {
  return (step.kind === 'guardrail' && step.passed === false) || (step.kind === 'tool' && step.status === 'failed');
}

/** 타임라인 요약 한 줄: 도구 n · 가드레일 검사 m(차단 k) · 보정 c. */
export function stepsDigest(steps: AgentStep[]): string {
  const tools = steps.filter((s) => s.kind === 'tool').length;
  const guards = steps.filter((s) => s.kind === 'guardrail');
  const blocked = guards.filter((s) => s.passed === false).length;
  const corrections = steps.filter((s) => s.decision === 'correction_requested').length;
  const parts = [`모델 ${steps.filter((s) => s.kind === 'model').length}`, `도구 ${tools}`, `가드레일 ${guards.length}` + (blocked ? ` (차단 ${blocked})` : '')];
  if (corrections) parts.push(`보정 ${corrections}`);
  return parts.join(' · ');
}
