import type { RunListItem } from '../../api/types';
import { caseInput, caseTitle } from '../../lib/cases';

/** 목록의 "내용 요약". 테스트 케이스는 케이스 제목, 실제 요청은 입력 앞부분. */
export function summaryOf(run: RunListItem): string {
  if (run.test_case_id) return caseTitle(run.test_case_id, run.input_preview);
  return (run.input_preview ?? '').split('\n')[0] || '(입력 없음)';
}

/** 마우스를 올렸을 때 보여줄 사용자 입력. */
export function inputOf(run: RunListItem): string {
  if (run.test_case_id) return caseInput(run.test_case_id, run.input_preview);
  return run.input_preview ?? '';
}
