import a from './anim.module.css';

export function TypingDots() {
  return (
    <span className={a.dots}>
      <span className={a.dot} />
      <span className={a.dot} />
      <span className={a.dot} />
    </span>
  );
}
