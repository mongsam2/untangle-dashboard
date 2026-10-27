import { useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import s from './AccessScreen.module.css';

interface AccessScreenProps {
  /** 이 탭에 남은 키를 확인하는 중이면 입력 칸 대신 안내만 보인다. */
  checking: boolean;
  /** 잠금 화면에 처음 보일 안내(키가 바뀐 경우 등). */
  message: string | null;
  /** 키를 확인하고, 실패하면 이유를 돌려준다. */
  onSubmit(key: string): Promise<string | null>;
}

// 대시보드 진입 화면. 팀이 정한 접근 키를 넣어야 기록을 볼 수 있다.
export function AccessScreen({ checking, message, onSubmit }: AccessScreenProps) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = error ?? message;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = key.trim();
    if (!value || busy) return;
    setBusy(true);
    const failure = await onSubmit(value);
    setBusy(false);
    if (failure) setError(failure);
  };

  return (
    <main className={s.page}>
      <form className={s.card} onSubmit={submit}>
        <h1 className={s.brand}>Tangle AI</h1>
        {checking ? (
          <p className={s.hint}>접근 키를 확인하는 중…</p>
        ) : (
          <>
            <p className={s.hint}>대시보드 접근 키를 입력해 주세요.</p>
            <label className={s.field}>
              <span className={s.label}>접근 키</span>
              <input
                className={s.input}
                type="password"
                autoComplete="current-password"
                autoFocus
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError(null);
                }}
                aria-invalid={shown ? true : undefined}
                aria-describedby={shown ? 'access-error' : undefined}
              />
            </label>
            {shown && (
              <p id="access-error" className={s.error} role="alert">
                {shown}
              </p>
            )}
            <Button variant="primary" type="submit" disabled={!key.trim() || busy}>
              {busy ? '확인하는 중…' : '들어가기'}
            </Button>
          </>
        )}
      </form>
    </main>
  );
}
