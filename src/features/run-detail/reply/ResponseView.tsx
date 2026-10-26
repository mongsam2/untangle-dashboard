import { isErrorResponse, type ChatResponse, type RunStatus, type StoredResponse } from '../../../api/types';
import { StepIcon } from '../../../components/StepIcon';
import { shortId } from '../../../lib/format';
import { hasFallbackAnswer } from '../../../lib/response';
import { BriefingCard, ProposalCard, QuestionList } from './ProposalCard';
import s from './ResponseView.module.css';

// 최종 응답 카드. 답변 말풍선 → 질문 또는 제안 카드 → 정보 카드 순서로 앱에 보이는 그대로 그린다.
export function ResponseView({ response, status }: { response: StoredResponse | null; status: RunStatus }) {
  return (
    <div className={`card ${s.card}`}>
      <div className={s.head}>
        <StepIcon kind="final" size={28} />
        <span className={s.label}>최종 응답</span>
        {response && !isErrorResponse(response) && (
          <span className={`mono ${s.meta}`} title={response.response_id}>
            response_id {shortId(response.response_id)}
          </span>
        )}
      </div>
      {!response ? (
        <span className={s.empty}>{status === 'normal' ? '아직 끝나지 않은 요청이라 저장된 응답이 없어요.' : '저장된 응답이 없어요.'}</span>
      ) : isErrorResponse(response) ? (
        <div className={s.error}>
          <span className={`mono ${s.errorCode}`}>{response.error.code}</span>
          <span>{response.error.message}</span>
          {response.error.retryable && <span>· 재시도 가능</span>}
        </div>
      ) : (
        <ChatBody r={response} />
      )}
    </div>
  );
}

function ChatBody({ r }: { r: ChatResponse }) {
  const empty = !r.answer && !r.ask && r.information_cards.length === 0;
  return (
    <>
      {r.answer && (
        <div className={s.bubbleWrap}>
          <span className={s.who}>
            탱글
            {hasFallbackAnswer(r) && (
              <span className={s.fallback} title="모델이 말풍선을 비워서 서버가 기본 문장으로 채웠어요. 모델이 쓴 문장이 아니에요.">
                서버 기본 문구
              </span>
            )}
          </span>
          <p className={s.bubble}>{r.answer.text}</p>
        </div>
      )}
      {r.ask?.text && <p className={`${s.bubble} ${s.askText}`}>{r.ask.text}</p>}
      {r.ask?.type === 'question' && r.ask.questions && (
        <div className={s.cards}>
          <QuestionList questions={r.ask.questions} />
        </div>
      )}
      {r.ask?.type === 'proposal' && r.ask.proposals && (
        <div className={s.cards}>
          {r.ask.proposals.map((p) => (
            <ProposalCard key={p.proposal_id} proposal={p} />
          ))}
        </div>
      )}
      {r.information_cards.map((c, i) => (
        <BriefingCard key={i} card={c} />
      ))}
      {empty && <span className={s.empty}>답변·질문·카드가 모두 비어 있어요.</span>}
    </>
  );
}
