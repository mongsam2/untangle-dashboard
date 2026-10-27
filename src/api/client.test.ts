import { describe, expect, it } from 'vitest';
import { dashboardUrl, fallbackMessage, toQuery } from './client';
import { pickServer } from './servers';

describe('dashboardUrl', () => {
  it('서버와 조회 경로를 조회 조건과 함께 검색어로 보낸다', () => {
    const url = new URL(dashboardUrl('prod', 'runs', toQuery({ source: 'real', limit: 100, cursor: 'a+b/c' })), 'http://x');
    expect(url.pathname).toBe('/api/dashboard');
    expect(Object.fromEntries(url.searchParams)).toEqual({ source: 'real', limit: '100', cursor: 'a+b/c', server: 'prod', route: 'runs' });
    expect(dashboardUrl('dev', 'stats')).toBe('/api/dashboard?server=dev&route=stats');
  });
});

describe('fallbackMessage', () => {
  it('본문 없는 404는 배포나 운영자 키를 확인하라고 알린다', () => {
    expect(fallbackMessage(404, 'Not Found')).toContain('운영자 키');
    expect(fallbackMessage(502, '')).toContain('연결하지 못했어요');
  });
});

describe('pickServer', () => {
  it('지난번 서버가 아직 있으면 그대로, 아니면 첫 서버를 쓴다', () => {
    expect(pickServer('prod', ['dev', 'prod'])).toBe('prod');
    expect(pickServer('prod', ['dev'])).toBe('dev');
    expect(pickServer('nope', ['dev', 'prod'])).toBe('dev');
    expect(pickServer(null, [])).toBeNull();
  });
});
