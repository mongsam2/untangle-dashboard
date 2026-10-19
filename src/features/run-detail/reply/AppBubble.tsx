import { isErrorResponse, type RunDetailResponse } from '../../../api/types';
import { Badge } from '../../../components/Badge';
import { StepIcon } from '../../../components/StepIcon';
import { RUN_STATUS, stepTone } from '../../../lib/status';
import s from './AppBubble.module.css';
import { ProposalCard } from './ProposalCard';
import { collectTitles, proposalCardOf } from './proposalCardModel';

// "최종 응답" 카드: 사용자가 받은 말풍선·제안서·선택지와 화면 표시·실행 결과.
export function AppBubble({ detail }: { detail: RunDetailResponse }) {
  const res = detail.response;
  const error = isErrorResponse(res) ? res.error : null;
  const chat = res && !isErrorResponse(res) ? res : null;
  const proposal = chat?.views?.find((v) => v.type === 'proposal');
  const titles = proposal ? collectTitles(detail) : null;
  const card = proposal?.type === 'proposal' ? proposalCardOf(proposal.data, (id) => titles?.get(id)) : null;
  const options = chat?.options ?? [];
  const views = chat?.views ?? [];
  const ops = chat?.operations ?? [];
  const errTone = RUN_STATUS.error;

  return (
    <div className={`card ${s.card}`}>
      <div className={s.head}>
        <StepIcon kind="final" />
        <span className={s.headTitle}>최종 응답</span>
      </div>
      <div className={s.chat}>
        <span className={s.speaker}>탱글</span>
        {res === null ? (
          <div className={s.missing}>저장된 응답이 없어요. 처리 중에 중단된 요청이에요.</div>
        ) : (
          <div className={s.bubble}>{error ? error.message : chat?.message}</div>
        )}
        {error && (
          <Badge bg={errTone.bg} fg={errTone.fg} dot={errTone.dot}>
            오류 응답 <span className="mono">{error.code}</span>
          </Badge>
        )}
        {detail.run.message_replaced && (
          <Badge bg="var(--failure-bg)" fg="var(--failure-fg)">
            서버 대체 메시지
          </Badge>
        )}
        {card && <ProposalCard card={card} />}
        {options.length > 0 && (
          <div className={s.options}>
            {options.map((o) => (
              <span key={o} className={s.option}>
                {o}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className={s.grid}>
        <span className={`th ${s.gridLabel}`}>화면 표시</span>
        <div className={s.views}>
          {views.map((v, i) => (
            <span key={i} className={`mono ${s.tchip}`}>
              {v.type}
            </span>
          ))}
          {views.length === 0 && <span className={s.muted}>없음</span>}
        </div>
        <span className={`th ${s.gridLabel} ${s.gridLabelLow}`}>실행 결과</span>
        <div className={s.ops}>
          {ops.map((o, i) => {
            const tone = stepTone(o.status);
            return (
              <div key={i} className={s.op}>
                <span className="mono">{o.action}</span>
                <span className={`mono ${s.muted}`}>
                  {o.target_type} {o.target_id ?? ''}
                </span>
                <Badge bg={tone.bg} fg={tone.fg} dot={tone.dot}>
                  {tone.label}
                </Badge>
              </div>
            );
          })}
          {ops.length === 0 && <span className={`${s.muted} ${s.noOps}`}>변경 없음</span>}
        </div>
      </div>
    </div>
  );
}
