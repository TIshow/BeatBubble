'use client';

import Image from 'next/image';
import type { CreatureDefinition } from '@/creatures/types';
import { useFloatingCompanion } from '@/hooks/useFloatingCompanion';
import type { Translations } from '@/lib/i18n';

export function EditorCompanion({
  creature,
  isPlaying,
  reactionKey,
  t,
}: {
  creature: CreatureDefinition;
  isPlaying: boolean;
  reactionKey: number;
  t: Translations;
}) {
  const copy = t.creatures[creature.discoveryId];
  const { rootRef, style, isDragging, handleProps } = useFloatingCompanion();

  return (
    <div
      ref={rootRef}
      className={`editor-companion ${isPlaying ? 'editor-companion--listening' : ''} ${isDragging ? 'editor-companion--dragging' : ''}`}
      style={style}
    >
      <button
        type="button"
        className="editor-companion-drag-handle"
        aria-label={`${t.companionCurrent(copy.name)}: ${t.companionMoveHint}`}
        {...handleProps}
      >
        <span className="editor-companion-stage" key={reactionKey} aria-hidden="true">
          <Image
            className="editor-companion-portrait"
            src={creature.portraitPath}
            alt=""
            width={112}
            height={112}
            sizes="(max-width: 599px) 88px, 112px"
          />
        </span>
      </button>
    </div>
  );
}
