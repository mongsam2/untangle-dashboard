import { useMemo } from 'react';
import { useConversation } from '../../api/queries';
import type { ConversationDetailResponse } from '../../api/types';
import { conversationSummary } from '../conversations/conversationModel';
import { buildConversationView, conversationScriptOf, conversationTimeline } from './conversationReplay';
import { PhoneChat } from './PhoneChat';
import { ReplayControls } from './ReplayControls';
import { ReplayDialog, ReplayLoading, TopBar } from './ReplayPlayer';
import s from './ReplayPlayer.module.css';
import { StepStream } from './StepStream';
import { useReplay } from './useReplay';

interface ConversationReplayPlayerProps {
  conversationId: string;
  onClose: () => void;
}

// 대화 전체를 턴 순서로 다시 보여주는 전체 화면. 앞 턴의 단계 카드와 누적 토큰·비용이 계속 쌓인다.
export function ConversationReplayPlayer({ conversationId, onClose }: ConversationReplayPlayerProps) {
  const q = useConversation(conversationId);
  const ready = q.data && q.data.turns.length > 0;
  return (
    <ReplayDialog label="대화 재생" onClose={onClose}>
      {ready ? <Player key={conversationId} detail={q.data!} onClose={onClose} /> : <ReplayLoading failed={q.isError || !!q.data} onClose={onClose} />}
    </ReplayDialog>
  );
}

function Player({ detail, onClose }: { detail: ConversationDetailResponse; onClose: () => void }) {
  const script = useMemo(() => conversationScriptOf(detail), [detail]);
  const timeline = useMemo(() => conversationTimeline(script), [script]);
  const rp = useReplay(timeline);
  const view = buildConversationView(script, rp.state);
  return (
    <>
      <TopBar caseLabel={'턴 ' + view.turnNumber + ' / ' + detail.conversation.turns} title={conversationSummary(detail.conversation)} onClose={onClose} />
      <div className={s.body}>
        <PhoneChat view={view} userText={view.userText} finalText={view.finalText} options={view.options} />
        <StepStream cards={view.cards} />
      </div>
      <ReplayControls view={view} playing={rp.state.playing} onToggle={rp.toggle} onPrev={rp.prev} onNext={rp.next} onSeek={rp.seek} />
    </>
  );
}
