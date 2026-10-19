import { useEffect, useState } from 'react';
import { shortId } from '../lib/format';
import s from './CopyId.module.css';

const COPIED_MS = 1200;

// 긴 ID(UUID)를 앞 8자리로 줄여 보이고, 누르면 전체 값을 클립보드에 복사한다.
export function CopyId({ id, className }: { id: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = () => {
    void navigator.clipboard?.writeText(id).then(
      () => setCopied(true),
      () => undefined,
    );
  };
  return (
    <button type="button" className={`mono ${s.id} ${className ?? ''}`} title={id + ' (눌러서 복사)'} aria-label={'ID ' + id + ' 복사'} onClick={copy}>
      {copied ? '복사됨' : shortId(id)}
    </button>
  );
}
