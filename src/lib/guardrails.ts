import type { GuardrailLayer } from '../api/types';

/** 가드레일 단계를 눌렀을 때 보이는 짧은 설명. */
export interface GuardrailInfo {
  /** 무엇을 검사하는지 */
  checks: string;
  /** 막히면 사용자 화면에서 무슨 일이 생기는지 */
  onBlock: string;
}

const INPUT_BLOCK = '모델을 부르지 않고 요청을 거절해요.';
const OUTPUT_BLOCK = '앱에는 아직 아무것도 안 보내고 탱글에게 한 번 고쳐 내게 해요. 또 걸리면 카드 없이 "답변을 정리하지 못했어요" 안내로 끝나요.';
const LIMIT_BLOCK = '만들던 카드는 하나도 보내지 않고 "나눠서 말해 달라"는 고정 안내로 끝나요.';

// 이름은 탱글 서버가 실행 기록에 남기는 검사 이름이다(`server-contract.md` §6 가드레일 단계, `guardrails.md`).
const FIXED: Record<string, GuardrailInfo> = {
  'input.length': {
    checks: '입력은 4,000자, 질문 직접 입력 답변은 하나당 500자 안인지 확인해요.',
    onBlock: INPUT_BLOCK,
  },
  'input.target_ownership': {
    checks: '사용자가 골라서 보낸 할 일·계획이 모두 그 사용자 것인지 확인해요.',
    onBlock: INPUT_BLOCK,
  },
  'input.answer_bundle': {
    checks: '질문에 답할 때 받은 질문 전부에 빠짐없이 한 번씩 답했는지, 선택지가 만료·위조되지 않았는지, 직접 입력이 비어 있지 않은지 확인해요.',
    onBlock: INPUT_BLOCK,
  },
  'output.structure': {
    checks: '답변·질문·카드 중 하나는 있는지, 질문은 1~3개에 선택지 2~4개인지, 질문과 제안 카드를 한 응답에 섞지 않았는지 확인해요.',
    onBlock: OUTPUT_BLOCK,
  },
  'output.length': {
    checks: '질문 문장은 200자, 선택지 문구는 40자 안인지 확인해요.',
    onBlock: OUTPUT_BLOCK,
  },
  'output.references': {
    checks: '응답에 붙인 카드와 선택지에 건 할 일이 이번 대화에서 실제로 만들었거나 조회한 것인지 확인해요. 지어낸 카드·실패한 카드를 막아요.',
    onBlock: OUTPUT_BLOCK,
  },
  'output.card_count': {
    checks: '제안 카드는 4개, 정보 카드는 정해진 개수까지만 붙였는지 확인해요.',
    onBlock: OUTPUT_BLOCK,
  },
  'output.missing_cards': {
    checks: '이번 대화에서 준비한 제안 카드를 응답에 빠뜨리지 않았는지 확인해요. 카드 없이 "추가해뒀어요"라고만 답하는 걸 막아요.',
    onBlock: OUTPUT_BLOCK,
  },
  'limit.time': {
    checks: '요청 하나를 90초 안에 끝냈는지 확인해요.',
    onBlock: LIMIT_BLOCK,
  },
  'limit.model_turns': {
    checks: '모델을 12번 넘게 오가지 않았는지 확인해요.',
    onBlock: LIMIT_BLOCK,
  },
};

const TOOL_ARGUMENTS: GuardrailInfo = {
  checks: '도구를 실행하기 전에 인자가 정해진 형식인지, 대상이 그 사용자 것인지, 계획엔 날짜가 있는지 같은 규칙을 지켰는지 확인해요.',
  onBlock: '도구를 실행하지 않고 오류를 탱글에게 돌려줘요. 탱글은 고쳐서 다시 부르거나 사용자에게 알려요.',
};

const TOOL_RESULT: GuardrailInfo = {
  checks: '도구 결과가 너무 커서 일부만 전체처럼 보이지 않는지 확인해요.',
  onBlock: '결과를 넘기지 않고 한도를 넘었다고 탱글에게 알려요. 탱글은 범위를 좁혀 다시 찾아요.',
};

/** 층과 이름으로 설명을 찾는다. 도구 검사는 `<도구 이름>.arguments`·`<도구 이름>.result` 꼴이다. 모르는 이름이면 null. */
export function guardrailInfo(layer: GuardrailLayer | null, name: string | null): GuardrailInfo | null {
  if (!layer || !name) return null;
  if (layer === 'tool') {
    if (name.endsWith('.arguments')) return TOOL_ARGUMENTS;
    if (name.endsWith('.result')) return TOOL_RESULT;
    return null;
  }
  return FIXED[layer + '.' + name] ?? null;
}
