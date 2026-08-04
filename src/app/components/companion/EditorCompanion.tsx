import Image from 'next/image';
import Link from 'next/link';
import type { CreatureDefinition } from '@/creatures/types';
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

  return (
    <section
      className={`editor-companion ${isPlaying ? 'editor-companion--listening' : ''}`}
      aria-label={t.companionCurrent(copy.name)}
    >
      <div className="editor-companion-stage" key={reactionKey} aria-hidden="true">
        <span className="editor-companion-glow" />
        <Image
          className="editor-companion-portrait"
          src={creature.portraitPath}
          alt=""
          width={112}
          height={112}
          sizes="80px"
        />
      </div>
      <div className="editor-companion-copy">
        <strong>{copy.name}</strong>
        <span>{isPlaying ? t.companionEditorListening : t.companionEditorWatching}</span>
      </div>
      <Link className="editor-companion-change" href="/discoveries">
        {t.companionChange}
      </Link>
    </section>
  );
}
