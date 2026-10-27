// 접근 키 잠금과 서버 선택. live 모드에서는 접근 키를 확인하기 전까지 대시보드를 보여 주지 않는다.
// 접근 키는 sessionStorage에 둬서 탭을 닫으면 다시 묻는다. 보는 서버는 주소의 ?server=가 정하고,
// 주소에 없을 때 쓰도록 마지막으로 고른 서버를 localStorage에 둔다.
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiMode, checkAccess, onAccessDenied, setAccessKey, type AccessResult } from '../api/client';
import { isServerId, pickServer, type ServerId } from '../api/servers';
import { AccessScreen } from './AccessScreen';

const KEY_STORAGE = 'untangle-dashboard.access-key';
const SERVER_STORAGE = 'untangle-dashboard.server';

// 사생활 보호 모드처럼 저장소를 못 쓰는 브라우저에서도 화면은 그대로 동작한다.
function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // 저장하지 못하면 이번 탭에서만 기억한다.
  }
}

const tab = () => window.sessionStorage;
const browser = () => window.localStorage;

export interface Connection {
  /** 연결된 서버. mock 모드에서는 비어 있다. */
  servers: readonly ServerId[];
  /** 주소에 서버가 없을 때 볼 서버(마지막으로 고른 서버). mock 모드에서는 null이다. */
  preferred: ServerId | null;
  /** 고른 서버를 다음에도 쓰도록 기억한다. */
  remember(id: ServerId): void;
  /** 접근 키를 지우고 잠금 화면으로 돌아간다. mock 모드에서는 null이다. */
  lock: (() => void) | null;
}

const MOCK: Connection = { servers: [], preferred: null, remember: () => undefined, lock: null };

const ConnectionContext = createContext<Connection>(MOCK);

export function useConnection(): Connection {
  return useContext(ConnectionContext);
}

/**
 * 지금 보는 서버. 주소의 ?server=가 연결된 서버면 그것, 아니면 마지막으로 고른 서버다.
 * 주소에서 바로 정해서, 서버를 바꾸는 순간에도 이전 서버의 상세 ID로 새 서버를 부르지 않는다.
 */
export function useServer(): ServerId | null {
  const { servers, preferred } = useConnection();
  const [params] = useSearchParams();
  const linked = params.get('server');
  return isServerId(linked) && servers.includes(linked) ? linked : preferred;
}

export function ConnectionProvider({ children }: { children: ReactNode }) {
  return apiMode === 'live' ? <LiveConnection>{children}</LiveConnection> : <>{children}</>;
}

type Gate = { state: 'checking' } | { state: 'locked'; message: string | null } | { state: 'open'; servers: ServerId[] };

function LiveConnection({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [gate, setGate] = useState<Gate>(() => (read(tab, KEY_STORAGE) ? { state: 'checking' } : { state: 'locked', message: null }));
  const [preferred, setPreferred] = useState<ServerId | null>(null);

  const apply = useCallback((key: string, result: AccessResult): string | null => {
    if (!result.ok) {
      write(tab, KEY_STORAGE, null);
      setGate({ state: 'locked', message: result.message });
      return result.message;
    }
    setAccessKey(key);
    write(tab, KEY_STORAGE, key);
    setPreferred(pickServer(read(browser, SERVER_STORAGE), result.servers));
    setGate({ state: 'open', servers: result.servers });
    return null;
  }, []);

  const lock = useCallback(
    (message: string | null) => {
      setAccessKey(null);
      write(tab, KEY_STORAGE, null);
      queryClient.clear();
      setGate({ state: 'locked', message });
    },
    [queryClient],
  );

  // 이 탭에 남은 키는 화면에 들어올 때 한 번 확인한다.
  useEffect(() => {
    const stored = read(tab, KEY_STORAGE);
    if (!stored) return;
    let alive = true;
    void checkAccess(stored).then((result) => {
      if (alive) apply(stored, result);
    });
    return () => {
      alive = false;
    };
  }, [apply]);

  useEffect(() => {
    onAccessDenied(() => lock('접근 키가 바뀌었어요. 다시 입력해 주세요.'));
    return () => onAccessDenied(null);
  }, [lock]);

  const remember = useCallback((id: ServerId) => {
    setPreferred(id);
    write(browser, SERVER_STORAGE, id);
  }, []);

  const servers = gate.state === 'open' ? gate.servers : null;
  const value = useMemo<Connection | null>(
    () => (servers ? { servers, preferred, remember, lock: () => lock(null) } : null),
    [servers, preferred, remember, lock],
  );

  if (!value) {
    return (
      <AccessScreen
        checking={gate.state === 'checking'}
        message={gate.state === 'locked' ? gate.message : null}
        onSubmit={async (key) => apply(key, await checkAccess(key))}
      />
    );
  }
  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}
