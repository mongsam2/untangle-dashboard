import { describe, expect, it } from 'vitest';
import { MOCK_RUNS } from '../../../api/mock/fixtures';
import type { ProposalView } from '../../../api/types';
import { collectTitles, proposalCardOf } from './proposalCardModel';

function proposalOf(caseId: string) {
  const d = MOCK_RUNS.find((x) => x.run.test_case_id === caseId)!;
  const res = d.response as { views: ProposalView[] };
  return { d, p: res.views.find((v) => v.type === 'proposal')!.data };
}

describe('제안서 카드', () => {
  it('첫 로드맵 제안: 표식 없음, 수락 대기', () => {
    const { p } = proposalOf('T10');
    const card = proposalCardOf(p);
    expect(card).toMatchObject({ id: 'p-9', typeLabel: '첫 로드맵 제안', applied: false, title: '포트폴리오 공개' });
    expect(card.meta).toBe('기한 10월 31일 23:59 · 완료 기준: 대표 프로젝트 3개를 공개 페이지에 게시');
    expect(card.items.map((i) => [i.title, i.category, i.mark])).toEqual([
      ['공개할 프로젝트 3개 고르기', '시작', ''],
      ['프로젝트별 보여줄 내용 적기', '지속', ''],
      ['소개 페이지 만들기', '지속', ''],
      ['게시한 사이트 확인하기', '완수', ''],
    ]);
    expect(card.removed).toEqual([]);
  });

  it('과제의 예정 시작·예상 소요 시간을 보여주고, 정해진 것이 없으면 비운다', () => {
    const card = proposalCardOf(proposalOf('T10').p);
    expect(card.items[0]!.schedule).toBe('10월 20일 09:00 · 30분');
    expect(card.items.slice(1).map((i) => i.schedule)).toEqual(['', '', '']);
  });

  it('사용자가 만든 과제는 역할이 없고 마감만 있을 수 있다', () => {
    const { p } = proposalOf('T10');
    const roadmap = [
      { ...p.result_preview!.roadmap![0]!, category: null, start_date: null, start_time: null, estimated_minutes: 90, deadline: '2026-10-25T23:59:00+09:00' },
    ];
    const card = proposalCardOf({ ...p, result_preview: { ...p.result_preview!, roadmap } });
    expect(card.items[0]).toMatchObject({ category: '', schedule: '90분 · 기한 10월 25일 23:59' });
  });

  it('수락 직행은 반영됨', () => {
    expect(proposalCardOf(proposalOf('T20').p).applied).toBe(true);
  });

  it('조정 제안: 완료·분할로 추가 표식과 빠지는 과제의 제목', () => {
    const { d, p } = proposalOf('T15');
    const titles = collectTitles(d);
    const card = proposalCardOf(p, (id) => titles.get(id));
    expect(card.typeLabel).toBe('조정 제안');
    expect(card.items.map((i) => i.mark)).toEqual(['완료', '분할로 추가', '분할로 추가', '', '']);
    expect(card.items[0]!.done).toBe(true);
    expect(card.removed).toEqual([{ title: '프로젝트별 보여줄 내용 적기', why: '두 과제로 분할' }]);
  });

  it('제목을 못 찾으면 과제 ID를 보여주고, UUID는 앞 8자리로 줄인다', () => {
    const { p } = proposalOf('T19');
    expect(proposalCardOf(p).removed[0]!.title).toBe('과제 c-12');
    const id = '19e7e324-d985-55e6-80d3-d0803a4d89e2';
    const changes = p.changes.map((c) => (c.action === 'delete_challenge' || c.action === 'split_challenge' ? { ...c, challenge_id: id } : c));
    expect(proposalCardOf({ ...p, changes }).removed[0]!.title).toBe('과제 19e7e324…');
  });
});
