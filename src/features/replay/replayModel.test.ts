import { describe, expect, it } from 'vitest';
import { MOCK_RUNS } from '../../api/mock/fixtures';
import {
  buildView,
  lastIndex,
  nextTick,
  RP_ANIM,
  RP_HIST_ANIM,
  RP_HIST_HOLD,
  RP_HOLD,
  RP_REPLY_HOLD,
  scriptOf,
  seek,
  START,
  toggle,
  totalDuration,
  type ReplayState,
} from './replayModel';

const byCase = (id: string) => MOCK_RUNS.find((d) => d.run.test_case_id === id)!;

describe('박자 예약', () => {
  const t24 = byCase('T24'); // 이전 대화 2개, 단계 7개
  const s = scriptOf(t24);

  it('박자 수 = 이전 대화 + 사용자 입력 + 단계 + 응답 전송', () => {
    expect(lastIndex(s)).toBe(2 + 7 + 1);
  });

  it('이전 대화는 짧게, 탱글 답변 뒤에는 읽는 텀', () => {
    expect(nextTick(START, s)).toEqual({ delay: RP_HIST_ANIM, next: { idx: 0, phase: 'done', playing: true } });
    expect(nextTick({ idx: 0, phase: 'done', playing: true }, s)!.delay).toBe(RP_HIST_HOLD);
    expect(nextTick({ idx: 1, phase: 'done', playing: true }, s)!.delay).toBe(RP_REPLY_HOLD);
  });

  it('이번 요청은 애니메이션 뒤 HOLD', () => {
    expect(nextTick({ idx: 2, phase: 'anim', playing: true }, s)!.delay).toBe(RP_ANIM);
    expect(nextTick({ idx: 5, phase: 'done', playing: true }, s)).toEqual({ delay: RP_HOLD, next: { idx: 6, phase: 'anim', playing: true } });
  });

  it('마지막 박자 뒤에는 멈춘다', () => {
    const last = lastIndex(s);
    expect(nextTick({ idx: last, phase: 'done', playing: true }, s)).toEqual({ delay: 0, next: { idx: last, phase: 'done', playing: false } });
    expect(nextTick({ idx: 3, phase: 'anim', playing: false }, s)).toBeNull();
  });

  it('전체 재생 시간', () => {
    // 이전 대화: 사용자(1100+500) + 탱글(1100+1400), 이후 8박자 × (1800+1000), 응답 전송 1800
    expect(totalDuration(s)).toBe(1600 + 2500 + 8 * 2800 + 1800);
  });

  it('끝난 뒤 재생 버튼은 처음부터, 탐색은 멈춘 상태', () => {
    const ended: ReplayState = { idx: lastIndex(s), phase: 'done', playing: false };
    expect(toggle(ended, s)).toEqual(START);
    expect(toggle({ idx: 3, phase: 'anim', playing: true }, s).playing).toBe(false);
    expect(seek(99, s)).toEqual({ idx: lastIndex(s), phase: 'done', playing: false });
    expect(seek(-1, s).idx).toBe(0);
  });
});

describe('재생 화면 모델', () => {
  const t21 = byCase('T21');
  const s = scriptOf(t21);
  const H = s.history.length;

  it('첫 박자: 사용자 말만, 단계 카드 없음', () => {
    const v = buildView(t21, s, START);
    expect(v.history).toHaveLength(1);
    expect(v.userShown).toBe(false);
    expect(v.cards).toEqual([]);
    expect(v.pos).toBe('1 / ' + (lastIndex(s) + 1));
  });

  it('탱글 말은 입력 중 표시 뒤에 나타난다', () => {
    const anim = buildView(t21, s, { idx: 1, phase: 'anim', playing: true });
    expect(anim.typing).toBe(true);
    expect(anim.history).toHaveLength(1);
    expect(buildView(t21, s, { idx: 1, phase: 'done', playing: true }).history).toHaveLength(2);
  });

  it('도구 카드: 진행 중엔 막대, 끝나면 배지·오류', () => {
    const toolIdx = H + 1 + s.steps.findIndex((x) => x.status === 'unknown');
    const running = buildView(t21, s, { idx: toolIdx, phase: 'anim', playing: true }).cards.at(-1)!;
    expect(running).toMatchObject({ kind: 'mutation', title: 'set_completion', current: true, anim: true });
    expect(running.bar).toBeDefined();
    expect(running.badge).toBeUndefined();
    const done = buildView(t21, s, { idx: toolIdx, phase: 'done', playing: false }).cards.at(-1)!;
    expect(done.badge!.label).toBe('unknown');
    expect(done.error!.code).toBe('outcome_unknown');
    expect(done.stamp).toBe('8.1s'); // 9000ms × 0.9(DF)
  });

  it('누적 토큰은 끝난 모델 호출만 더한다', () => {
    const first = H + 1;
    expect(buildView(t21, s, { idx: first, phase: 'anim', playing: true }).cumIn).toBe(0);
    const v = buildView(t21, s, { idx: first, phase: 'done', playing: true });
    expect(v.cumIn).toBe(s.steps[0]!.input_tokens);
  });

  it('마지막 박자: 최종 답변과 응답 전송 카드, 끝 표시', () => {
    const last = lastIndex(s);
    const v = buildView(t21, s, { idx: last, phase: 'done', playing: false });
    expect(v.finalShown).toBe(true);
    expect(v.typing).toBe(false);
    expect(v.cards.at(-1)).toMatchObject({ kind: 'final', title: '응답 전송' });
    expect(v.cards.at(-1)!.stamp).toMatch(/^총 \d+\.\ds · \$0\.\d{4}$/);
    expect(v.ended).toBe(true);
    // 답변 대체 카드도 재생에 들어간다.
    expect(v.cards.some((c) => c.kind === 'server' && c.text?.startsWith('실패한 도구가 있어'))).toBe(true);
    expect(v.markers.filter((m) => m.current)).toHaveLength(1);
  });
});
