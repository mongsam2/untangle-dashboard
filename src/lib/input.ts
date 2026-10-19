import type { ChatInput } from '../api/types';

// 버튼 입력은 원문이 없어서 사용자가 누른 버튼을 문장으로 보여준다.
export function inputText(input: ChatInput): string {
  switch (input.type) {
    case 'message':
      return input.text;
    case 'proposal_accept':
      return "(제안 카드에서 '제안 수락'을 누름)";
    case 'proposal_reject':
      return "(제안 카드에서 '지금은 안 할게요'를 누름)";
  }
}
