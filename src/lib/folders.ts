// A lesson's folder (#143). Teachers make them; children file songs into the
// open ones for their class. Closing (archived) only takes a folder out of the
// children's choices — the work inside stays where it was submitted.
export type SongFolder = {
  id: string;
  name: string;
  prompt: string | null;
  grade: number;
  // Null means every class in the grade.
  class_name: string | null;
  archived: boolean;
  // Whether the class may ask AI for help while this folder is open (#151).
  ai_enabled: boolean;
  created_at: string;
};

export const FOLDER_COLUMNS = "id, name, prompt, grade, class_name, archived, ai_enabled, created_at";

// Open folders first — the ones anyone acts on — newest first within each.
export function byOpenThenNewest(a: SongFolder, b: SongFolder): number {
  return Number(a.archived) - Number(b.archived) || b.created_at.localeCompare(a.created_at);
}
