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
  saveErrorBlockedWord: string;
  saveErrorTooLarge: string;
  saveErrorFailed: string;
  overwrite: string;
  saveAsNew: string;
  // Songs page
  backToCreate: string;
  pageTitle: string;
  loading: string;
  noSongs: string;
  noMySongs: string;
  playBtn: string;
  feedAll: string;
  feedMine: string;
  feedTemplates: string;
  noTemplates: string;
  templateBadge: string;
  templateOn: string;
  templateOff: string;
  rename: string;
  deleteSong: string;
  confirmDeleteSong: string;
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
  // Locale toggle label (the language you'll switch TO)
  switchLocale: string;
  login: string;
  logout: string;
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
    saveErrorBlockedWord: "That title or name can't be used.",
    saveErrorTooLarge: "This song is too large to save.",
    saveErrorFailed: "Couldn't save. Please try again.",
    overwrite: "Update",
    saveAsNew: "Save as new",
    backToCreate: "← Create",
    pageTitle: "Everyone's Songs",
    loading: "Loading...",
    noSongs: "No songs yet. Be the first to save one!",
    noMySongs: "You haven't saved any songs yet.",
    playBtn: "Play",
    feedAll: "All",
    feedMine: "Mine",
    feedTemplates: "Templates",
    noTemplates: "No templates yet.",
    templateBadge: "Template",
    templateOn: "Make template",
    templateOff: "Unset template",
    rename: "Rename",
    deleteSong: "Delete",
    confirmDeleteSong: "Delete this song?",
    justNow: "just now",
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
    daysAgo: (n) => `${n}d ago`,
    switchLocale: "日本語",
    login: "Log in",
    logout: "Log out",
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
    saveErrorBlockedWord: "つかえない ことばが はいっています。",
    saveErrorTooLarge: "きょくが おおきすぎて ほぞんできません。",
    saveErrorFailed: "ほぞんに しっぱいしました。もういちど ためしてね。",
    overwrite: "うわがき保存",
    saveAsNew: "新しく保存",
    backToCreate: "← つくる",
    pageTitle: "みんなの曲",
    loading: "よみこみちゅう...",
    noSongs: "まだ曲がありません。さいしょに保存してみよう！",
    noMySongs: "まだ じぶんの曲が ありません。",
    playBtn: "あそぶ",
    feedAll: "みんな",
    feedMine: "じぶん",
    feedTemplates: "テンプレ",
    noTemplates: "まだ テンプレートが ありません。",
    templateBadge: "テンプレ",
    templateOn: "テンプレにする",
    templateOff: "テンプレ解除",
    rename: "なまえをかえる",
    deleteSong: "けす",
    confirmDeleteSong: "この曲を けしますか？",
    justNow: "たったいま",
    minutesAgo: (n) => `${n}分まえ`,
    hoursAgo: (n) => `${n}時間まえ`,
    daysAgo: (n) => `${n}日まえ`,
    switchLocale: "EN",
    login: "ログイン",
    logout: "ログアウト",
  },
};
