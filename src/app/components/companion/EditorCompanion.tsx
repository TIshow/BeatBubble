'use client';

import Image from 'next/image';
import Link from 'next/link';
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
    <section
      ref={rootRef}
      className={`editor-companion ${isPlaying ? 'editor-companion--listening' : ''} ${isDragging ? 'editor-companion--dragging' : ''}`}
      aria-label={t.companionCurrent(copy.name)}
      style={style}
    >
      <button
        type="button"
        className="editor-companion-drag-handle"
        aria-label={`${t.companionCurrent(copy.name)}: ${t.companionMoveHint}`}
        {...handleProps}
      >
        <span className="editor-companion-grip" aria-hidden="true">
          ⠿
        </span>
        <span className="editor-companion-stage" key={reactionKey} aria-hidden="true">
          <span className="editor-companion-glow" />
          <Image
            className="editor-companion-portrait"
            src={creature.portraitPath}
            alt=""
            width={112}
            height={112}
            sizes="96px"
          />
        </span>
        <span className="editor-companion-copy">
          <strong>{copy.name}</strong>
          <span>{isPlaying ? t.companionEditorListening : t.companionEditorWatching}</span>
          <small>{t.companionMoveHint}</small>
        </span>
      </button>
      <Link className="editor-companion-change" href="/discoveries">
        {t.companionChange}
      </Link>
    </section>
  );
}
