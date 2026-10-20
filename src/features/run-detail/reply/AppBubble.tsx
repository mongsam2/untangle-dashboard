import type { RunDetailResponse } from '../../../api/types';
import { Badge } from '../../../components/Badge';
import { CopyId } from '../../../components/CopyId';
import { StepIcon } from '../../../components/StepIcon';
import { MUTATION_OUTCOME, RUN_STATUS, stepTone } from '../../../lib/status';
import s from './AppBubble.module.css';
import { ProposalCard } from './ProposalCard';
import { collectTitles, proposalCardOf } from './proposalCardModel';
import { chatOf, errorOf, noteStateRows, outcomeCounts, rejectedOf } from './responseModel';

// "최종 응답" 카드: 사용자가 받은 말풍선·제안서·선택지와 화면 표시·실행 결과.
export function AppBubble({ detail }: { detail: RunDetailResponse }) {
  const res = detail.response;
  const error = errorOf(res);
  const chat = chatOf(res);
  const proposal = chat?.views?.find((v) => v.type === 'proposal');
  const titles = collectTitles(detail);
  const card = proposal?.type === 'proposal' ? proposalCardOf(proposal.data, (id) => titles.get(id)) : null;
  const options = chat?.options ?? [];
  const views = chat?.views ?? [];
  const ops = chat?.operations ?? [];
  const mutations = chat?.mutation_results ?? [];
  const counts = outcomeCounts(mutations);
  const rejected = rejectedOf(mutations);
  const notes = noteStateRows(chat?.note_states ?? []);
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
          <div className={s.bubble}>{chat ? chat.message : error?.message}</div>
        )}
        {error && (
          <Badge bg={errTone.bg} fg={errTone.fg} dot={errTone.dot}>
            오류 응답 <span className="mono">{error.code}</span>
            {error.retryable ? ' · 재시도 가능' : ''}
          </Badge>
        )}
        {error && chat && <span className={s.note}>답변은 실패했지만 확인된 실행 결과가 있어서 대화 응답으로 나갔어요. 아래 결과를 먼저 확인해 주세요.</span>}
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
                  {o.target_type}{' '}
                  {o.target_id && (titles.get(o.target_id) ? <span title={o.target_id}>{titles.get(o.target_id)}</span> : <CopyId id={o.target_id} />)}
                </span>
                <Badge bg={tone.bg} fg={tone.fg} dot={tone.dot}>
                  {tone.label}
                </Badge>
              </div>
            );
          })}
          {ops.length === 0 && <span className={`${s.muted} ${s.noOps}`}>변경 없음</span>}
        </div>
        <span className={`th ${s.gridLabel}`}>사용자 변경</span>
        <div className={s.ops}>
          {counts.length > 0 ? (
            <div className={s.counts}>
              {counts.map((c) => {
                const tone = MUTATION_OUTCOME[c.status];
                return (
                  <Badge key={c.status} bg={tone.bg} fg={tone.fg} dot={tone.dot}>
                    {tone.label} {c.count}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <span className={`${s.muted} ${s.noOps}`}>함께 받은 변경 없음</span>
          )}
          {rejected.map((r) => (
            <div key={r.mutationId} className={s.op}>
              <CopyId id={r.mutationId} />
              <span className="mono">{r.code}</span>
              <span className={s.muted}>{r.message}</span>
            </div>
          ))}
        </div>
        <span className={`th ${s.gridLabel}`}>노트 상태</span>
        <div className={s.ops}>
          {notes.map((n) => (
            <div key={n.goalId} className={s.op}>
              <span title={n.goalId}>{n.title}</span>
              <span className={`mono ${s.muted}`}>rev {n.revision}</span>
              <span className={s.muted}>
                과제 {n.challenges}개{n.deletedChallenges > 0 ? ' · 삭제 ' + n.deletedChallenges + '개' : ''}
                {n.goalDeleted ? ' · 삭제된 목표' : ''}
              </span>
            </div>
          ))}
          {notes.length === 0 && <span className={`${s.muted} ${s.noOps}`}>없음</span>}
        </div>
      </div>
    </div>
  );
}
