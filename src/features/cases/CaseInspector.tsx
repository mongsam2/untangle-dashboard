import { useCase } from '../../api/queries';
import { useViewState } from '../../app/useViewState';
import { Badge } from '../../components/Badge';
import { Inspector, InspectorBody, InspectorHero, InspectorMessage } from '../../components/Inspector';
import { caseInput, caseTitle } from '../../lib/cases';
import { caseMeta } from './caseModel';
import s from './CaseInspector.module.css';
import { CaseRunTable } from './CaseRunTable';

export function CaseInspector({ caseId }: { caseId: string }) {
  const view = useViewState();
  const q = useCase(caseId);
  const d = q.data;
  return (
    <Inspector label="테스트 케이스 상세" onClose={view.close}>
      {d ? (
        <>
          <InspectorHero>
            <div className={s.badges}>
              <Badge mono bg="var(--color-canvas)" fg="var(--color-ink)">
                {caseId}
              </Badge>
              <Badge bg="var(--color-divider)" fg="var(--color-ink)">
                테스트
              </Badge>
            </div>
            <h2 className={s.title}>{caseTitle(caseId, d.runs[0]?.input_preview)}</h2>
            <div className={s.meta}>
              {caseMeta(d).map((m) => (
                <div key={m.label} className={s.metaItem}>
                  <span className={s.metaLabel}>{m.label}</span>
                  <span className={`mono ${s.metaValue} ${m.alert ? s.alert : ''}`}>{m.value}</span>
                </div>
              ))}
            </div>
          </InspectorHero>
          <InspectorBody>
            <div className={`card ${s.input}`}>
              {/* 기록된 입력이 있으면 최근 실행의 입력, 없으면 카탈로그의 예시 입력이다. */}
              <span className="th">{d.runs[0]?.input_preview ? '최근 입력' : '예시 입력'}</span>
              <span className={s.inputText}>{caseInput(caseId, d.runs[0]?.input_preview)}</span>
            </div>
            <CaseRunTable runs={d.runs} onOpen={(id) => view.openRun(id, caseId)} />
          </InspectorBody>
        </>
      ) : q.isError ? (
        <InspectorMessage>케이스를 불러오지 못했어요. {q.error.message}</InspectorMessage>
      ) : (
        <InspectorMessage>불러오는 중…</InspectorMessage>
      )}
    </Inspector>
  );
}
