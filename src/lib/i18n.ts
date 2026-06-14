export type Locale = "en" | "ja";

export type Translations = {
  // Transport
  play: string;
  stop: string;
  // Controls
  tempo: string;
  sound: string;
  range: string;
  blocks: string;
  allNotes: string;
  nNotes: (n: number) => string;
  blackKeys: string;
  lockMode: string;
  settings: string;
  // Actions
  undo: string;
  reset: string;
  resetConfirm: string;
  confirmYes: string;
  save: string;
  songsLink: string;
  // Note panel
  activeNotes: string;
  tapToExclude: string;
  showAll: string;
  // Save modal
  saveModalTitle: string;
  titlePlaceholder: string;
  authorPlaceholder: string;
  cancel: string;
  saving: string;
  // Songs page
  backToCreate: string;
  pageTitle: string;
  loading: string;
  noSongs: string;
  playBtn: string;
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
  // Locale toggle label (the language you'll switch TO)
  switchLocale: string;
};

export const translations: Record<Locale, Translations> = {
  en: {
    play: "Play",
    stop: "Stop",
    tempo: "Tempo",
    sound: "Sound",
    range: "Range",
    blocks: "Blocks",
    allNotes: "All notes",
    nNotes: (n) => `${n} notes`,
    blackKeys: "Black keys",
    lockMode: "🔒 Lock",
    settings: "Settings",
    undo: "Undo",
    reset: "Reset",
    resetConfirm: "Clear everything?",
    confirmYes: "Yes",
    save: "Save",
    songsLink: "Songs",
    activeNotes: "Active notes",
    tapToExclude: "Tap to exclude notes",
    showAll: "Show all",
    saveModalTitle: "Save Song",
    titlePlaceholder: "Song title",
    authorPlaceholder: "Your name",
    cancel: "Cancel",
    saving: "Saving...",
    backToCreate: "← Create",
    pageTitle: "Everyone's Songs",
    loading: "Loading...",
    noSongs: "No songs yet. Be the first to save one!",
    playBtn: "Play",
    justNow: "just now",
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
    daysAgo: (n) => `${n}d ago`,
    switchLocale: "日本語",
  },
  ja: {
    play: "えんそう",
    stop: "とめる",
    tempo: "テンポ",
    sound: "おと",
    range: "おんいき",
    blocks: "ブロック",
    allNotes: "ぜんぶのおと",
    nNotes: (n) => `${n}このおと`,
    blackKeys: "くろいけんばん",
    lockMode: "🔒 ロック",
    settings: "せってい",
    undo: "もどす",
    reset: "リセット",
    resetConfirm: "ぜんぶけす？",
    confirmYes: "はい",
    save: "ほぞん",
    songsLink: "みんなの曲",
    activeNotes: "つかうおと",
    tapToExclude: "のぞくおとをタップ",
    showAll: "ぜんぶみせる",
    saveModalTitle: "曲をほぞん",
    titlePlaceholder: "きょくのなまえ",
    authorPlaceholder: "あなたのなまえ",
    cancel: "キャンセル",
    saving: "ほぞんちゅう...",
    backToCreate: "← つくる",
    pageTitle: "みんなの曲",
    loading: "よみこみちゅう...",
    noSongs: "まだ曲がありません。さいしょに保存してみよう！",
    playBtn: "あそぶ",
    justNow: "たったいま",
    minutesAgo: (n) => `${n}分まえ`,
    hoursAgo: (n) => `${n}時間まえ`,
    daysAgo: (n) => `${n}日まえ`,
    switchLocale: "EN",
  },
};
