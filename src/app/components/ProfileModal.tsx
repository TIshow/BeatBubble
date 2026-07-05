"use client";

import { useState } from "react";
import type { Translations } from "@/lib/i18n";
import type { Gender, Profile, ProfileEdits } from "@/hooks/useProfile";

const GENDERS: Gender[] = ["male", "female", "other", "undisclosed"];
const GRADES = [1, 2, 3, 4, 5, 6];
const MAX_NAME = 60;
const MAX_SCHOOL = 100;
const MAX_CLASS = 40;

interface Props {
  t: Translations;
  profile: Profile | null;
  onSave: (edits: ProfileEdits) => Promise<{ error: unknown }>;
  onClose: () => void;
}

function genderLabel(t: Translations, g: Gender): string {
  switch (g) {
    case "male":
      return t.genderMale;
    case "female":
      return t.genderFemale;
    case "other":
      return t.genderOther;
    case "undisclosed":
      return t.genderUndisclosed;
  }
}

// Trim to null so empty fields clear the column rather than storing "".
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function ProfileModal({ t, profile, onSave, onClose }: Props) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [school, setSchool] = useState(profile?.school ?? "");
  const [grade, setGrade] = useState<number | null>(profile?.grade ?? null);
  const [className, setClassName] = useState(profile?.className ?? "");
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: saveError } = await onSave({
        displayName: orNull(displayName),
        school: orNull(school),
        grade,
        className: orNull(className),
        gender,
      });
      if (saveError) {
        setError(t.profileSaveFailed);
        return;
      }
      onClose();
    } catch {
      setError(t.profileSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{t.profileModalTitle}</h2>
        <div className="modal-fields">
          <label className="modal-field">
            <span className="modal-label">{t.profileDisplayName}</span>
            <input
              className="modal-input"
              placeholder={t.profileNamePlaceholder}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={MAX_NAME}
            />
          </label>

          <label className="modal-field">
            <span className="modal-label">{t.profileSchool}</span>
            <input
              className="modal-input"
              placeholder={t.profileSchoolPlaceholder}
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              maxLength={MAX_SCHOOL}
            />
          </label>

          <label className="modal-field">
            <span className="modal-label">{t.profileGrade}</span>
            <select
              className="modal-input"
              value={grade ?? ""}
              onChange={(e) => setGrade(e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">{t.profileNotSet}</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {t.profileGradeUnit(g)}
                </option>
              ))}
            </select>
          </label>

          <label className="modal-field">
            <span className="modal-label">{t.profileClass}</span>
            <input
              className="modal-input"
              placeholder={t.profileClassPlaceholder}
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              maxLength={MAX_CLASS}
            />
          </label>

          <label className="modal-field">
            <span className="modal-label">{t.profileGender}</span>
            <select
              className="modal-input"
              value={gender ?? ""}
              onChange={(e) => setGender(e.target.value === "" ? null : (e.target.value as Gender))}
            >
              <option value="">{t.profileNotSet}</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {genderLabel(t, g)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            {t.cancel}
          </button>
          <button className="modal-save" onClick={handleSave} disabled={saving}>
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
