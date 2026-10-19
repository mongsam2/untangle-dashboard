import { useState } from 'react';
import type { HistoryMessage } from '../../api/types';
import { Button } from '../../components/Button';
import s from './UserInput.module.css';

// 사용자 입력과 접히는 이전 대화.
export function UserInput({ text, history }: { text: string; history: HistoryMessage[] }) {
  const [open, setOpen] = useState(false);
  const has = history.length > 0;
  return (
    <div className={`card ${s.card}`}>
      <div className={s.head}>
        <span className="th">사용자 입력</span>
        {has ? (
          <Button variant="text" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? '이전 대화 접기' : '이전 대화 ' + history.length + '개 보기'}
          </Button>
        ) : (
          <span className="th">첫 메시지</span>
        )}
      </div>
      {has && open && (
        <>
          <div className={s.history}>
            <span className="th">이전 대화</span>
            {history.map((h, i) => (
              <div key={i} className={s.line}>
                <span className={h.role === 'user' ? s.roleUser : s.roleAgent}>{h.role === 'user' ? '사용자' : '탱글'}</span>
                <span className={s.text}>{h.text}</span>
              </div>
            ))}
          </div>
          <span className="th">마지막 입력</span>
        </>
      )}
      <div className={s.input}>{text}</div>
    </div>
  );
}
