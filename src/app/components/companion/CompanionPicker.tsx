import Image from 'next/image';
import type { CreatureDefinition } from '@/creatures/types';
import type { Translations } from '@/lib/i18n';

export function CompanionPicker({
  selectedCreature,
  hasSelection,
  isAccount,
  isLoading,
  isSaving,
  t,
  onChooseNone,
}: {
  selectedCreature: CreatureDefinition | null;
  hasSelection: boolean;
  isAccount: boolean;
  isLoading: boolean;
  isSaving: boolean;
  t: Translations;
  onChooseNone: () => void;
}) {
  const copy = selectedCreature ? t.creatures[selectedCreature.discoveryId] : null;

  return (
    <section className="companion-picker" aria-labelledby="companion-picker-title">
      <div className="companion-picker-copy">
        <span className="companion-picker-mark" aria-hidden="true">
          ♪
        </span>
        <div>
          <h2 id="companion-picker-title">{t.companionPickerTitle}</h2>
          <p>{t.companionPickerIntro}</p>
          <p className="companion-picker-scope">
            {isAccount ? t.companionAccountScope : t.companionGuestScope}
          </p>
        </div>
      </div>

      <div className="companion-picker-current" aria-live="polite">
        {isLoading ? (
          <span className="companion-picker-status">{t.loading}</span>
        ) : selectedCreature && copy ? (
          <>
            <Image
              className="companion-picker-portrait"
              src={selectedCreature.portraitPath}
              alt=""
              width={112}
              height={112}
              sizes="72px"
            />
            <strong>{t.companionCurrent(copy.name)}</strong>
          </>
        ) : (
          <strong>{t.companionNoneCurrent}</strong>
        )}
        <button
          type="button"
          className="companion-none-btn"
          aria-pressed={!hasSelection}
          disabled={isLoading || isSaving || !hasSelection}
          onClick={onChooseNone}
        >
          {isSaving ? t.companionSaving : t.companionChooseNone}
        </button>
      </div>
    </section>
  );
}
