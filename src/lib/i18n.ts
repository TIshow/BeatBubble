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
  exportWav: string;
  exporting: string;
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
  saveErrorAuth: string;
  saveErrorRateLimit: string;
  overwrite: string;
  saveAsNew: string;
  // Songs page
  backToCreate: string;
  pageTitle: string;
  loading: string;
  noSongs: string;
  noMySongs: string;
  playBtn: string;
  copyLink: string;
  linkCopied: string;
  songMenu: string;
  feedAll: string;
  feedMine: string;
  feedTemplates: string;
  noTemplates: string;
  searchPlaceholder: string;
  searchClear: string;
  noResults: string;
  filterGradeAll: string;
  filterClassAll: string;
  songsCount: (n: number) => string;
  loadingMore: string;
  showMore: string;
  templateBadge: string;
  templateOn: string;
  templateOff: string;
  visPublic: string;
  visUnlisted: string;
  visDraft: string;
  visibilityLabel: string;
  saveChoiceHint: string;
  savePublicHint: string;
  saveDraftBtn: string;
  savePublicBtn: string;
  savedDraftMsg: string;
  savedPublicMsg: string;
  close: string;
  loadFailed: string;
  rename: string;
  deleteSong: string;
  confirmDeleteSong: string;
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
  login: string;
  logout: string;
  logoutConfirm: string;
  // Account menu
  accountMenu: string;
  languageLabel: string;
  // Profile
  profile: string;
  profileModalTitle: string;
  profileDisplayName: string;
  profileSchool: string;
  profileGrade: string;
  profileClass: string;
  profileGender: string;
  profileGradeUnit: (n: number) => string;
  profileNotSet: string;
  genderMale: string;
  genderFemale: string;
  genderOther: string;
  genderUndisclosed: string;
  profileSaved: string;
  profileSaveFailed: string;
  profileSchoolPlaceholder: string;
  profileClassPlaceholder: string;
  profileNamePlaceholder: string;
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
    exportWav: "Export",
    exporting: "Exporting...",
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
    saveErrorAuth: "Your login may have expired. Please log out and log in again.",
    saveErrorRateLimit: "It's busy right now. Please wait a moment and try again.",
    overwrite: "Update",
    saveAsNew: "Save as new",
    backToCreate: "← Create",
    pageTitle: "Everyone's Songs",
    loading: "Loading...",
    noSongs: "No songs yet. Be the first to save one!",
    noMySongs: "You haven't saved any songs yet.",
    playBtn: "Play",
    copyLink: "Copy link",
    linkCopied: "Copied!",
    songMenu: "More",
    feedAll: "All",
    feedMine: "Mine",
    feedTemplates: "Templates",
    noTemplates: "No templates yet.",
    searchPlaceholder: "Search by song or name",
    searchClear: "Clear",
    noResults: "No matching songs.",
    filterGradeAll: "All grades",
    filterClassAll: "All classes",
    songsCount: (n) => `${n} songs`,
    loadingMore: "Loading more...",
    showMore: "Show more",
    templateBadge: "Template",
    templateOn: "Make template",
    templateOff: "Unset template",
    visPublic: "Public",
    visUnlisted: "Unlisted",
    visDraft: "Draft",
    visibilityLabel: "Visibility",
    saveChoiceHint: "A draft can be published anytime later.",
    savePublicHint: "This will be published to Everyone's Songs.",
    saveDraftBtn: "Save as draft",
    savePublicBtn: "Save & publish",
    savedDraftMsg: "Saved as a draft! Find it under \"Mine\" in Everyone's Songs.",
    savedPublicMsg: "Published to Everyone's Songs!",
    close: "Close",
    loadFailed: "Couldn't open this song. Check that you're logged in, then reload to try again.",
    rename: "Rename",
    deleteSong: "Delete",
    confirmDeleteSong: "Delete this song?",
    justNow: "just now",
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
    daysAgo: (n) => `${n}d ago`,
    login: "Log in",
    logout: "Log out",
    logoutConfirm: "Log out?",
    accountMenu: "Account",
    languageLabel: "Language",
    profile: "Profile",
    profileModalTitle: "Your profile",
    profileDisplayName: "Name",
    profileSchool: "School",
    profileGrade: "Grade",
    profileClass: "Class",
    profileGender: "Gender",
    profileGradeUnit: (n) => `Grade ${n}`,
    profileNotSet: "—",
    genderMale: "Boy",
    genderFemale: "Girl",
    genderOther: "Other",
    genderUndisclosed: "Prefer not to say",
    profileSaved: "Saved!",
    profileSaveFailed: "Couldn't save. Please try again.",
    profileSchoolPlaceholder: "School name",
    profileClassPlaceholder: "e.g. 1, A",
    profileNamePlaceholder: "Your name or nickname",
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
    exportWav: "書き出し",
    exporting: "書き出しちゅう...",
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
    saveErrorAuth: "ログインの ゆうこうきげんが きれたかも。一度 ログアウトして、もう一度 ログインしてね。",
    saveErrorRateLimit: "いま こんざつしています。少し 時間を おいてから もう一度 ためしてね。",
    overwrite: "うわがき保存",
    saveAsNew: "新しく保存",
    backToCreate: "← つくる",
    pageTitle: "みんなの曲",
    loading: "よみこみちゅう...",
    noSongs: "まだ曲がありません。さいしょに保存してみよう！",
    noMySongs: "まだ じぶんの曲が ありません。",
    playBtn: "あそぶ",
    copyLink: "リンクをコピー",
    linkCopied: "コピーしました！",
    songMenu: "メニュー",
    feedAll: "みんな",
    feedMine: "じぶん",
    feedTemplates: "テンプレ",
    noTemplates: "まだ テンプレートが ありません。",
    searchPlaceholder: "きょくや なまえで さがす",
    searchClear: "けす",
    noResults: "みつかりませんでした。",
    filterGradeAll: "すべての学年",
    filterClassAll: "すべてのクラス",
    songsCount: (n) => `${n}曲`,
    loadingMore: "よみこみちゅう...",
    showMore: "もっと見る",
    templateBadge: "テンプレ",
    templateOn: "テンプレにする",
    templateOff: "テンプレ解除",
    visPublic: "公開",
    visUnlisted: "限定公開",
    visDraft: "下書き",
    visibilityLabel: "公開はんい",
    saveChoiceHint: "下書きは あとから いつでも 公開できるよ。",
    savePublicHint: "保存すると「みんなの曲」に公開されます。",
    saveDraftBtn: "下書きほぞん",
    savePublicBtn: "公開してほぞん",
    savedDraftMsg: "下書きに ほぞんしたよ！「みんなの曲」の「じぶん」から 見られるよ。",
    savedPublicMsg: "「みんなの曲」に 公開したよ！",
    close: "とじる",
    loadFailed: "この曲を ひらけなかったよ。ログインしているか たしかめて、ページを さいよみこみ してみてね。",
    rename: "なまえをかえる",
    deleteSong: "けす",
    confirmDeleteSong: "この曲を けしますか？",
    justNow: "たったいま",
    minutesAgo: (n) => `${n}分まえ`,
    hoursAgo: (n) => `${n}時間まえ`,
    daysAgo: (n) => `${n}日まえ`,
    login: "ログイン",
    logout: "ログアウト",
    logoutConfirm: "本当にログアウトしますか？",
    accountMenu: "アカウント",
    languageLabel: "ことば",
    profile: "プロフィール",
    profileModalTitle: "プロフィール",
    profileDisplayName: "なまえ",
    profileSchool: "がっこう",
    profileGrade: "がくねん",
    profileClass: "クラス",
    profileGender: "せいべつ",
    profileGradeUnit: (n) => `${n}年`,
    profileNotSet: "—",
    genderMale: "男の子",
    genderFemale: "女の子",
    genderOther: "その他",
    genderUndisclosed: "こたえない",
    profileSaved: "ほぞんしました！",
    profileSaveFailed: "ほぞんに しっぱいしました。もういちど ためしてね。",
    profileSchoolPlaceholder: "がっこうのなまえ",
    profileClassPlaceholder: "れい: 1、A",
    profileNamePlaceholder: "なまえ か ニックネーム",
  },
};
