import { X } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { MusicianProfile, OrchestraSceneDefinition } from '../../types/demo';

interface StageInsightSheetProps {
  musician: MusicianProfile | null;
  currentScene: OrchestraSceneDefinition;
  isInLineup: boolean;
  onClose: () => void;
  onToggleLineup: (musicianId: string) => void;
}

export function StageInsightSheet({
  musician,
  currentScene,
  isInLineup,
  onClose,
  onToggleLineup,
}: StageInsightSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!musician) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        const buttons = sheetRef.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [musician]);

  if (!musician) return null;

  return createPortal(
    <div className="stage-mobile__sheet-layer">
      <button className="stage-mobile__sheet-backdrop" type="button" aria-label="关闭乐手详情" onClick={onClose} />
      <section className="stage-mobile__sheet" role="dialog" aria-modal="true" aria-labelledby="stage-musician-title" ref={sheetRef}>
        <div className="stage-mobile__sheet-handle" aria-hidden="true" />
        <div className="stage-mobile__sheet-heading">
          <div>
            <span className="stage-mobile__sheet-eyebrow">乐手数字名片 · {currentScene.shortLabel}</span>
            <h2 id="stage-musician-title">{musician.instrument}</h2>
          </div>
          <button className="stage-mobile__sheet-close" type="button" onClick={onClose} ref={closeRef} aria-label="关闭乐手详情">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p className="stage-mobile__sheet-role">{musician.roleSummary}</p>
        <p>{musician.knowledgeSummary}</p>
        {musician.featuredWorks.length ? (
          <div className="stage-mobile__sheet-works">
            <h3>代表作品</h3>
            <ul>{musician.featuredWorks.map((work) => <li key={work}>{work}</li>)}</ul>
          </div>
        ) : null}
        <button className="stage-mobile__lineup-action" type="button" onClick={() => onToggleLineup(musician.id)}>
          {isInLineup ? '移出当前演奏' : '加入当前演奏'}
        </button>
      </section>
    </div>,
    document.body,
  );
}
