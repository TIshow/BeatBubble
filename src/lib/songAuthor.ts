// Pure helpers for showing a teacher which account made a song (#117).
// Kept out of the hook so the formatting rules can be tested without pulling in
// the Supabase client (which needs env vars at import time).

// The account behind a song, as a teacher needs to see it.
export type SongAuthor = {
  displayName: string | null;
  grade: number | null;
  className: string | null;
};

// Labels the caller supplies, so this stays free of the i18n import.
export type AccountLineLabels = {
  none: string;
  notSet: string;
  gradeUnit: (n: number) => string;
};

// The teacher-facing line for one song, or undefined when there is nothing to
// show yet. Pure, so the formatting and the `differs` rule are testable without
// a signed-in teacher.
//
// `differs` is the signal a teacher actually needs: the typed author not
// matching the account is how a child publishes under someone else's name.
export function accountLineFor(
  song: { user_id: string | null; author: string },
  authors: Map<string, SongAuthor>,
  labels: AccountLineLabels
): { text: string; differs: boolean } | undefined {
  // No account at all: say so rather than leave a blank — "not identifiable"
  // is itself the answer.
  if (!song.user_id) return { text: labels.none, differs: false };
  const account = authors.get(song.user_id);
  if (!account) return undefined; // still loading
  const name = account.displayName ?? labels.notSet;
  const where = [
    account.grade != null ? labels.gradeUnit(account.grade) : null,
    account.className,
  ]
    .filter(Boolean)
    .join("");
  return {
    text: where ? `${name}（${where}）` : name,
    // Only meaningful when the account actually has a name to compare against.
    differs: !!account.displayName && account.displayName !== song.author,
  };
}

// Why a song is worth a teacher's second look, or null when nothing stands out.
//
// Both reasons are facts about the row, not judgements of the music: a save
// with no account can't be traced to anyone, and a typed name that doesn't
// match the account is how a child publishes under someone else's name. The
// title itself is deliberately NOT judged here — flagging songs by their words
// would turn the view into a correctness system (see #97).
export function reviewReasonFor(
  song: { user_id: string | null; author: string },
  authors: Map<string, SongAuthor>,
  labels: { anonymous: string; nameMismatch: string }
): string | null {
  if (!song.user_id) return labels.anonymous;
  const account = authors.get(song.user_id);
  if (!account) return null; // unknown while loading — don't flag on no evidence
  if (account.displayName && account.displayName !== song.author) {
    return labels.nameMismatch;
  }
  return null;
}
