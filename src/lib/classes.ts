// The grade and class pickers, shared by the profile form and the teacher's
// folder form. They must stay one list: a child can submit into a folder only
// when the folder's class equals the class on their profile (songs_folder_guard,
// migration 0016), so two lists that drifted apart would quietly lock a class
// out of its own folder.
export const GRADES = [1, 2, 3, 4, 5, 6];

// Class is a fixed picker (numbers then letters) so the same class can't be
// typed in variants (半角/全角/「組」つき) that split it into separate tabs.
export const CLASS_OPTIONS = [
  ...Array.from({ length: 10 }, (_, i) => String(i + 1)), // 1..10
  ..."ABCDEFG".split(""), // A..G
];
