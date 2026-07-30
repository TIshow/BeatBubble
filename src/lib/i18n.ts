import type { DiscoveryId } from '@/discovery/types';

export type Locale = 'en' | 'ja';

export type DiscoveryCardTranslation = {
  name: string;
  reveal: string;
  description: string;
  hint: string;
  theory: string;
};

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
  reflectTitle: string;
  reflectBody: string;
  reflectChangeName: string;
  reflectSaveAnyway: string;
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
  saveAnonWarn: string;
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
  profileNamePlaceholder: string;
  // Discoveries
  discoveriesLink: string;
  discoveryAlbumTitle: string;
  discoveryAlbumIntro: string;
  discoveryProgress: (earned: number, total: number) => string;
  discoveryFound: string;
  discoveryMoreFound: (n: number) => string;
  discoveryLocked: string;
  discoveryHintLabel: string;
  discoveryTheoryLabel: string;
  discoveryDate: (date: string) => string;
  discoveryGuestNotice: string;
  discoveryLoginToKeep: string;
  discoverySyncError: string;
  discoveryRetry: string;
  discoveryCards: Record<DiscoveryId, DiscoveryCardTranslation>;
};

export const translations: Record<Locale, Translations> = {
  en: {
    play: 'Play',
    stop: 'Stop',
    tempo: 'Tempo',
    sound: 'Sound',
    range: 'Range',
    blocks: 'Blocks',
    allNotes: 'All notes',
    nNotes: (n) => `${n} notes`,
    blackKeys: 'Black keys',
    lockMode: '🔒 Lock',
    settings: 'Settings',
    undo: 'Undo',
    reset: 'Reset',
    resetConfirm: 'Clear everything?',
    confirmYes: 'Yes',
    save: 'Save',
    exportWav: 'Export',
    exporting: 'Exporting...',
    songsLink: 'Songs',
    activeNotes: 'Active notes',
    tapToExclude: 'Tap to exclude notes',
    showAll: 'Show all',
    saveModalTitle: 'Save Song',
    titlePlaceholder: 'Song title',
    authorPlaceholder: 'Your name',
    cancel: 'Cancel',
    saving: 'Saving...',
    saveErrorBlockedWord: "This name can't be used. Please pick another one.",
    reflectTitle: 'Wait a sec',
    reflectBody:
      'Could this name make a friend feel sad or upset? Take another look before you save.',
    reflectChangeName: 'Change the name',
    reflectSaveAnyway: 'Save anyway',
    saveErrorTooLarge: 'This song is too large to save.',
    saveErrorFailed: "Couldn't save. Please try again.",
    saveErrorAuth: 'Your login may have expired. Please log out and log in again.',
    saveErrorRateLimit: "It's busy right now. Please wait a moment and try again.",
    overwrite: 'Update',
    saveAsNew: 'Save as new',
    backToCreate: '← Create',
    pageTitle: "Everyone's Songs",
    loading: 'Loading...',
    noSongs: 'No songs yet. Be the first to save one!',
    noMySongs: "You haven't saved any songs yet.",
    playBtn: 'Play',
    copyLink: 'Copy link',
    linkCopied: 'Copied!',
    songMenu: 'More',
    feedAll: 'All',
    feedMine: 'Mine',
    feedTemplates: 'Templates',
    noTemplates: 'No templates yet.',
    searchPlaceholder: 'Search by song or name',
    searchClear: 'Clear',
    noResults: 'No matching songs.',
    filterGradeAll: 'All grades',
    filterClassAll: 'All classes',
    songsCount: (n) => `${n} songs`,
    loadingMore: 'Loading more...',
    showMore: 'Show more',
    templateBadge: 'Template',
    templateOn: 'Make template',
    templateOff: 'Unset template',
    visPublic: 'Public',
    visUnlisted: 'Unlisted',
    visDraft: 'Draft',
    visibilityLabel: 'Visibility',
    saveChoiceHint: 'A draft can be published anytime later.',
    saveAnonWarn:
      "You're not logged in. If you save now it goes public and you won't be able to delete it yourself later.",
    saveDraftBtn: 'Save as draft',
    savePublicBtn: 'Save & publish',
    savedDraftMsg: 'Saved as a draft! Find it under "Mine" in Everyone\'s Songs.',
    savedPublicMsg: "Published to Everyone's Songs!",
    close: 'Close',
    loadFailed: "Couldn't open this song. Check that you're logged in, then reload to try again.",
    rename: 'Rename',
    deleteSong: 'Delete',
    confirmDeleteSong: 'Delete this song?',
    justNow: 'just now',
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
    daysAgo: (n) => `${n}d ago`,
    login: 'Log in',
    logout: 'Log out',
    logoutConfirm: 'Log out?',
    accountMenu: 'Account',
    languageLabel: 'Language',
    profile: 'Profile',
    profileModalTitle: 'Your profile',
    profileDisplayName: 'Name',
    profileSchool: 'School',
    profileGrade: 'Grade',
    profileClass: 'Class',
    profileGender: 'Gender',
    profileGradeUnit: (n) => `Grade ${n}`,
    profileNotSet: '—',
    genderMale: 'Boy',
    genderFemale: 'Girl',
    genderOther: 'Other',
    genderUndisclosed: 'Prefer not to say',
    profileSaved: 'Saved!',
    profileSaveFailed: "Couldn't save. Please try again.",
    profileSchoolPlaceholder: 'School name',
    profileNamePlaceholder: 'Your name or nickname',
    discoveriesLink: 'Discoveries',
    discoveryAlbumTitle: 'Discovery Album',
    discoveryAlbumIntro: 'Make sounds, listen closely, and collect the musical surprises you find.',
    discoveryProgress: (earned, total) => `${earned} / ${total} found`,
    discoveryFound: 'Discovery!',
    discoveryMoreFound: (n) => `${n} more discoveries!`,
    discoveryLocked: '???',
    discoveryHintLabel: 'Try this',
    discoveryTheoryLabel: 'Music words',
    discoveryDate: (date) => `Found ${date}`,
    discoveryGuestNotice: 'These discoveries are saved for this browser session.',
    discoveryLoginToKeep:
      'Discoveries you find after logging in are saved to your account and other devices.',
    discoverySyncError: "Some discoveries haven't synced yet.",
    discoveryRetry: 'Try again',
    discoveryCards: {
      interval_third: {
        name: 'Twin Stars',
        reveal: 'Two notes lit up together!',
        description: 'Two different notes overlapped and made a gently blended sound.',
        hint: 'Move either note a little. Can you make the stars appear again?',
        theory: 'The distance between these notes is called a third.',
      },
      open_fifth: {
        name: 'Wide Sky',
        reveal: 'The sound opened up!',
        description: 'Two far-apart notes made a broad, open sound.',
        hint: 'Try the same shape higher or lower.',
        theory: 'Perfect fifths and octaves often sound open and stable.',
      },
      close_tension: {
        name: 'Tingly Neighbors',
        reveal: 'The sound gave a little shiver!',
        description: 'Two neighboring sounds rubbed together and made tension.',
        hint: 'Use this sound when something strange or scary is about to happen.',
        theory: 'Notes one semitone apart create strong musical tension.',
      },
      stepwise_run: {
        name: 'Sound Staircase',
        reveal: 'A staircase appeared!',
        description: 'Four notes climbed or descended one small step at a time.',
        hint: 'How long can you make the staircase?',
        theory: 'Moving between nearby notes is called stepwise motion.',
      },
      call_and_response: {
        name: 'Call and Answer',
        reveal: 'The sounds answered each other!',
        description: 'One musical shape returned like a reply from a friend.',
        hint: 'Make the answer start on a different note.',
        theory: 'Music can be organized as a call followed by a response.',
      },
      rest_then_burst: {
        name: 'Wait... Pop!',
        reveal: 'The quiet made the next sound burst!',
        description: 'A full beat of silence made the following sounds feel bigger.',
        hint: 'Try making the quiet part even longer.',
        theory: 'Rests shape musical phrases just as much as sounding notes do.',
      },
      rhythm_loop: {
        name: 'Rhythm Engine',
        reveal: 'The rhythm started an engine!',
        description: 'The same busy rhythm returned in the next beat.',
        hint: 'Keep the rhythm but change the pitches.',
        theory: 'A repeating rhythmic pattern is often called an ostinato.',
      },
      sustain_contrast: {
        name: 'Comet Trail',
        reveal: 'A long sound left a sparkling trail!',
        description: 'A long note was followed by quick, short notes.',
        hint: 'Swap the order: what happens when short notes come first?',
        theory: 'Contrasting note lengths gives a phrase shape and motion.',
      },
    },
  },
  ja: {
    play: 'えんそう',
    stop: 'とめる',
    tempo: 'テンポ',
    sound: 'おと',
    range: 'おんいき',
    blocks: 'ブロック',
    allNotes: 'ぜんぶのおと',
    nNotes: (n) => `${n}このおと`,
    blackKeys: 'くろいけんばん',
    lockMode: '🔒 ロック',
    settings: 'せってい',
    undo: 'もどす',
    reset: 'リセット',
    resetConfirm: 'ぜんぶけす？',
    confirmYes: 'はい',
    save: 'ほぞん',
    exportWav: '書き出し',
    exporting: '書き出しちゅう...',
    songsLink: 'みんなの曲',
    activeNotes: 'つかうおと',
    tapToExclude: 'のぞくおとをタップ',
    showAll: 'ぜんぶみせる',
    saveModalTitle: '曲をほぞん',
    titlePlaceholder: 'きょくのなまえ',
    authorPlaceholder: 'あなたのなまえ',
    cancel: 'キャンセル',
    saving: 'ほぞんちゅう...',
    saveErrorBlockedWord: 'この なまえは つかえないよ。ちがう なまえに してね。',
    reflectTitle: 'ちょっと まってね',
    reflectBody:
      'その なまえを 見た ともだちが、いやな きもちに なったり、かなしく ならないかな？ もういちど かんがえてみよう。',
    reflectChangeName: 'なまえを かえる',
    reflectSaveAnyway: 'このままで ほぞん',
    saveErrorTooLarge: 'きょくが おおきすぎて ほぞんできません。',
    saveErrorFailed: 'ほぞんに しっぱいしました。もういちど ためしてね。',
    saveErrorAuth:
      'ログインの ゆうこうきげんが きれたかも。一度 ログアウトして、もう一度 ログインしてね。',
    saveErrorRateLimit: 'いま こんざつしています。少し 時間を おいてから もう一度 ためしてね。',
    overwrite: 'うわがき保存',
    saveAsNew: '新しく保存',
    backToCreate: '← つくる',
    pageTitle: 'みんなの曲',
    loading: 'よみこみちゅう...',
    noSongs: 'まだ曲がありません。さいしょに保存してみよう！',
    noMySongs: 'まだ じぶんの曲が ありません。',
    playBtn: 'あそぶ',
    copyLink: 'リンクをコピー',
    linkCopied: 'コピーしました！',
    songMenu: 'メニュー',
    feedAll: 'みんな',
    feedMine: 'じぶん',
    feedTemplates: 'テンプレ',
    noTemplates: 'まだ テンプレートが ありません。',
    searchPlaceholder: 'きょくや なまえで さがす',
    searchClear: 'けす',
    noResults: 'みつかりませんでした。',
    filterGradeAll: 'すべての学年',
    filterClassAll: 'すべてのクラス',
    songsCount: (n) => `${n}曲`,
    loadingMore: 'よみこみちゅう...',
    showMore: 'もっと見る',
    templateBadge: 'テンプレ',
    templateOn: 'テンプレにする',
    templateOff: 'テンプレ解除',
    visPublic: '公開',
    visUnlisted: '限定公開',
    visDraft: '下書き',
    visibilityLabel: '公開はんい',
    saveChoiceHint: '下書きは あとから いつでも 公開できるよ。',
    saveAnonWarn:
      'ログインしていないよ。このまま ほぞんすると「みんなの曲」に こうかいされて、あとで じぶんで けせなくなるよ。',
    saveDraftBtn: '下書きほぞん',
    savePublicBtn: '公開してほぞん',
    savedDraftMsg: '下書きに ほぞんしたよ！「みんなの曲」の「じぶん」から 見られるよ。',
    savedPublicMsg: '「みんなの曲」に 公開したよ！',
    close: 'とじる',
    loadFailed:
      'この曲を ひらけなかったよ。ログインしているか たしかめて、ページを さいよみこみ してみてね。',
    rename: 'なまえをかえる',
    deleteSong: 'けす',
    confirmDeleteSong: 'この曲を けしますか？',
    justNow: 'たったいま',
    minutesAgo: (n) => `${n}分まえ`,
    hoursAgo: (n) => `${n}時間まえ`,
    daysAgo: (n) => `${n}日まえ`,
    login: 'ログイン',
    logout: 'ログアウト',
    logoutConfirm: '本当にログアウトしますか？',
    accountMenu: 'アカウント',
    languageLabel: 'ことば',
    profile: 'プロフィール',
    profileModalTitle: 'プロフィール',
    profileDisplayName: 'なまえ',
    profileSchool: 'がっこう',
    profileGrade: 'がくねん',
    profileClass: 'クラス',
    profileGender: 'せいべつ',
    profileGradeUnit: (n) => `${n}年`,
    profileNotSet: '—',
    genderMale: '男の子',
    genderFemale: '女の子',
    genderOther: 'その他',
    genderUndisclosed: 'こたえない',
    profileSaved: 'ほぞんしました！',
    profileSaveFailed: 'ほぞんに しっぱいしました。もういちど ためしてね。',
    profileSchoolPlaceholder: 'がっこうのなまえ',
    profileNamePlaceholder: 'なまえ か ニックネーム',
    discoveriesLink: 'はっけん',
    discoveryAlbumTitle: 'はっけんアルバム',
    discoveryAlbumIntro: '音をつくって、よくきいて。見つけた音楽のふしぎを集めよう。',
    discoveryProgress: (earned, total) => `${earned} / ${total} はっけん`,
    discoveryFound: 'はっけん！',
    discoveryMoreFound: (n) => `ほかにも ${n}まい みつけた！`,
    discoveryLocked: '？？？',
    discoveryHintLabel: 'ためしてみよう',
    discoveryTheoryLabel: '音楽のことば',
    discoveryDate: (date) => `${date} に はっけん`,
    discoveryGuestNotice: 'このブラウザをひらいているあいだ、はっけんをおぼえているよ。',
    discoveryLoginToKeep:
      'ログインしてから見つけたカードは、つぎにひらいたときや別の端末でも見られるよ。',
    discoverySyncError: 'まだ ほぞんできていないカードがあるよ。',
    discoveryRetry: 'もういちど',
    discoveryCards: {
      interval_third: {
        name: 'ふたご星',
        reveal: 'ふたつの音が いっしょに光った！',
        description: 'ちがう高さの音がかさなって、やさしくまざりあったよ。',
        hint: 'どちらかの音をすこし動かして、もう一度 星を出せるかな？',
        theory: 'この音どうしのきょりは「3度」とよばれるよ。',
      },
      open_fifth: {
        name: 'ひろがる空',
        reveal: '音のむこうに 空がひらいた！',
        description: 'はなれたふたつの音が、ひろくてのびやかなひびきを作ったよ。',
        hint: '同じかたちを、もっと高いところや低いところでためしてみよう。',
        theory: '「完全5度」や「オクターブ」は、ひろく安定したひびきになりやすいよ。',
      },
      close_tension: {
        name: 'ちょっとドキドキ',
        reveal: '音が ぶるっとふるえた！',
        description: 'となりあう音がぶつかって、ドキドキするひびきになったよ。',
        hint: 'ふしぎなことや、こわいことが起こる前の音に使ってみよう。',
        theory: '半音となりの音は、つよい緊張感を作ることがあるよ。',
      },
      stepwise_run: {
        name: '音のかいだん',
        reveal: '音のかいだんが あらわれた！',
        description: '4つの音が、ちかい高さへ少しずつのぼったり、おりたりしたよ。',
        hint: 'どこまで長いかいだんを作れるかな？',
        theory: 'ちかい高さへ進む動きを「順次進行」とよぶよ。',
      },
      call_and_response: {
        name: 'よびかけとへんじ',
        reveal: '音どうしが おへんじした！',
        description: 'さいしょの音のかたちに、もうひとつの音のかたちが答えたよ。',
        hint: 'へんじのはじまりを、ちがう高さにしてみよう。',
        theory: '音楽にも「よびかけ」と「こたえ」の組み立てかたがあるよ。',
      },
      rest_then_burst: {
        name: 'ためて、ドン！',
        reveal: 'しずけさのあとで 音がはじけた！',
        description: '1ぱくのしずけさが、つぎの音をもっと大きく感じさせたよ。',
        hint: 'しずかなところを、もっと長くしたらどうなるかな？',
        theory: '休符も、音とおなじように音楽のまとまりを作っているよ。',
      },
      rhythm_loop: {
        name: 'リズムエンジン',
        reveal: 'リズムのエンジンが うごきだした！',
        description: 'いそがしい同じリズムが、つぎのはくでもう一度あらわれたよ。',
        hint: 'リズムはそのままで、音の高さだけかえてみよう。',
        theory: 'くりかえすリズムのかたちは「オスティナート」とよばれることがあるよ。',
      },
      sustain_contrast: {
        name: 'ながれ星',
        reveal: '長い音が きらきらのあとをのこした！',
        description: '長くのびる音のあとに、すばやい短い音がつづいたよ。',
        hint: 'こんどは、短い音をさきにしたらどう聞こえるかな？',
        theory: '音の長さをくらべると、音楽にかたちや動きが生まれるよ。',
      },
    },
  },
};
