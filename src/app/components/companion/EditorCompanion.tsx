'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { CreatureDefinition } from '@/creatures/types';
import type { CompanionTalk } from '@/hooks/useCompanionLine';
import { useFloatingCompanion } from '@/hooks/useFloatingCompanion';
import type { Translations } from '@/lib/i18n';
import type { OwnLine, Speech } from '@/ui/companionLine';
import { bubbleSide, type BubbleSide } from '@/ui/floatingPosition';

function ownLineText(line: OwnLine, t: Translations): string {
  switch (line) {
    case 'thinking':
      return t.companionThinking;
    case 'empty':
      return t.companionSilentSong;
    case 'no-words':
      return t.companionNoWords;
    case 'limit':
      return t.companionLimit;
    case 'unavailable':
      return t.companionUnavailable;
  }
}

function SpeechBubble({ speech, side, t }: { speech: Speech; side: BubbleSide; t: Translations }) {
  return (
    <p
      className={`editor-companion-bubble editor-companion-bubble--${side.vertical} editor-companion-bubble--${side.horizontal}`}
    >
      {/* Only words an AI wrote are marked; the companion's own lines aren't. */}
      {speech.kind === 'ai' && (
        <span className="editor-companion-ai-mark" title={t.companionAiMarkTitle}>
          AI
        </span>
      )}
      {speech.kind === 'ai' ? speech.text : ownLineText(speech.line, t)}
    </p>
  );
}

export function EditorCompanion({
  creature,
  isPlaying,
  reactionKey,
  talk,
  t,
}: {
  creature: CreatureDefinition;
  isPlaying: boolean;
  reactionKey: number;
  // Present where a tap asks the AI for a line (#151); the server checks again.
  talk: CompanionTalk | null;
  t: Translations;
}) {
  const copy = t.creatures[creature.discoveryId];
  const speech = talk?.speech ?? null;
  const [side, setSide] = useState<BubbleSide>({ vertical: 'above', horizontal: 'end' });
  const { rootRef, style, isDragging, handleProps } = useFloatingCompanion({
    onTap: () => {
      if (!talk) return;
      // Measured on the tap, since the companion may have been moved.
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) setSide(bubbleSide(rect, window.innerWidth));
      void talk.speak();
    },
    // The bubble was placed for where the companion was.
    onDragStart: talk?.hush,
  });
  const thinking = speech?.kind === 'own' && speech.line === 'thinking';
  const hint = talk ? t.companionMoveAndTalkHint : t.companionMoveHint;

  return (
    <div
      ref={rootRef}
      className={`editor-companion ${isPlaying || thinking ? 'editor-companion--listening' : ''} ${isDragging ? 'editor-companion--dragging' : ''}`}
      style={style}
    >
      {talk && (
        <div className="editor-companion-voice" aria-live="polite">
          {speech && <SpeechBubble speech={speech} side={side} t={t} />}
        </div>
      )}
      <button
        type="button"
        className="editor-companion-drag-handle"
        aria-label={`${t.companionCurrent(copy.name)}: ${hint}`}
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
