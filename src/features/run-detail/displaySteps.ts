import type { AgentStep, RunListItem } from '../../api/types';

export interface DisplayStep extends AgentStep {
  /** 모델 단계의 순번(1부터). 다른 단계는 null. */
  modelIndex: number | null;
  /** 저장된 단계가 아니라 run.message_replaced를 보여주려고 만든 단계. */
  virtual: boolean;
}

export const SWAP_NOTE = '실패한 도구가 있어 모델 답변 대신 도구 오류 메시지를 응답으로 보냄';

// 화면에 그릴 단계 목록. 답변 대체는 API에서 단계가 아닌 플래그라서 마지막에 서버 판단 카드로 붙인다.
export function displaySteps(run: RunListItem, steps: AgentStep[]): DisplayStep[] {
  let mi = 0;
  const out: DisplayStep[] = [...steps]
    .sort((a, b) => a.seq - b.seq)
    .map((s) => ({ ...s, modelIndex: s.kind === 'model' ? ++mi : null, virtual: false }));
  if (run.message_replaced) {
    const last = out[out.length - 1];
    out.push({
      seq: (last?.seq ?? 0) + 1,
      kind: 'server',
      started_at: run.finished_at,
      duration_ms: 0,
      note: SWAP_NOTE,
      modelIndex: null,
      virtual: true,
    });
  }
  return out;
}

export function modelSteps(steps: DisplayStep[]): DisplayStep[] {
  return steps.filter((s) => s.kind === 'model');
}

export function tokensOf(s: AgentStep) {
  const input = s.input_tokens ?? 0;
  const cached = s.cached_tokens ?? 0;
  const output = s.output_tokens ?? 0;
  const reasoning = s.reasoning_tokens ?? 0;
  return { input, cached, output, reasoning, fresh: input - cached, answer: output - reasoning };
}

/** 도구 결과 안의 오류 메시지. 단계에는 코드만 있어서 결과 객체에서 꺼낸다. */
export function errorMessageOf(s: AgentStep): string {
  const err = s.result?.error;
  if (err && typeof err === 'object' && !Array.isArray(err) && typeof err.message === 'string') return err.message;
  return '';
}
