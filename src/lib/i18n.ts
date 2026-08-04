import type { DiscoveryId } from '@/discovery/types';
import type { ChallengeId, ChallengeTechniqueId } from '@/challenges/types';

export type Locale = 'en' | 'ja';

export type CreatureTranslation = {
  name: string;
  personality: string;
  reveal: string;
  description: string;
  hint: string;
  theory: string;
  alt: string;
};

export type ChallengeCardTranslation = {
  title: string;
  prompt: string;
  sceneLabel: string;
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
  // Teacher-only: the account behind a song (the printed author is free text).
  authorAccountLabel: string;
  authorAccountNone: string;
  authorAccountDiffers: string;
  saveVisibleToTeacher: string;
  // Teacher dashboard (/teacher)
  teacherLink: string;
  teacherTitle: string;
  teacherIntro: string;
  teacherSearch: string;
  teacherFilterAll: string;
  teacherFilterReview: string;
  teacherFilterHidden: string;
  teacherReviewCount: (n: number) => string;
  teacherReasonNameMismatch: string;
  teacherReasonAnonymous: string;
  teacherColTitle: string;
  teacherColAccount: string;
  teacherColClass: string;
  teacherColUpdated: string;
  teacherColActions: string;
  teacherTypedAs: (name: string) => string;
  teacherOpen: string;
  teacherHide: string;
  teacherUnhide: string;
  teacherHiddenBadge: string;
  teacherEmpty: string;
  teacherLoadError: string;
  teacherSongCount: (n: number) => string;
  teacherShowEmails: string;
  teacherHideEmails: string;
  teacherEmailsHiddenNote: string;
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
  discoveryFocusHint: string;
  discoveryAhaLabel: string;
  discoveryAcknowledge: string;
  discoveryLocked: string;
  discoveryCreatureLocked: string;
  discoveryCreatureMet: string;
  discoveryEntryNumber: (number: number) => string;
  discoveryHintLabel: string;
  discoveryCreatureReasonLabel: string;
  discoveryTheoryLabel: string;
  discoveryDate: (date: string) => string;
  discoveryGuestNotice: string;
  discoveryLoginToKeep: string;
  discoverySyncError: string;
  discoveryRetry: string;
  creatures: Record<DiscoveryId, CreatureTranslation>;
  // Open-ended challenges
  challengeOpen: string;
  challengePickerTitle: string;
  challengePickerIntro: string;
  challengeRandom: string;
  challengeActive: string;
  challengeDone: string;
  challengeExit: string;
  challengeWorldWaiting: string;
  challengeCompleteTitle: string;
  challengeCompleteIntro: string;
  challengeIdeasTitle: string;
  challengeIdeasEmpty: string;
  challengeKeepCreating: string;
  challengeChooseAnother: string;
  challengeCards: Record<ChallengeId, ChallengeCardTranslation>;
  challengeTechniques: Record<ChallengeTechniqueId, string>;
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
    authorAccountLabel: 'Account',
    authorAccountNone: 'No account (not identifiable)',
    authorAccountDiffers: 'differs from the typed name',
    saveVisibleToTeacher: 'Your teacher can see who made each song.',
    teacherLink: 'Teacher view',
    teacherTitle: 'Teacher view',
    teacherIntro: 'Published songs only — drafts stay private to each child.',
    teacherSearch: 'Search title, name or account',
    teacherFilterAll: 'All',
    teacherFilterReview: 'Needs a look',
    teacherFilterHidden: 'Hidden',
    teacherReviewCount: (n) => `${n} to look at`,
    teacherReasonNameMismatch: "Name doesn't match the account",
    teacherReasonAnonymous: 'No account',
    teacherColTitle: 'Song',
    teacherColAccount: 'Account',
    teacherColClass: 'Class',
    teacherColUpdated: 'Updated',
    teacherColActions: '',
    teacherTypedAs: (name) => `typed as "${name}"`,
    teacherOpen: 'Open',
    teacherHide: 'Hide',
    teacherUnhide: 'Unhide',
    teacherHiddenBadge: 'Hidden',
    teacherEmpty: 'No songs match.',
    teacherLoadError: "Couldn't load the songs. Please reload.",
    teacherSongCount: (n) => `${n} songs`,
    teacherShowEmails: 'Show emails',
    teacherHideEmails: 'Hide emails',
    teacherEmailsHiddenNote: 'Emails hidden — safe to show on the classroom screen.',
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
    discoveriesLink: 'Creature guide',
    discoveryAlbumTitle: 'Sound Creature Guide',
    discoveryAlbumIntro:
      'Make sounds, listen closely, and meet the creatures hiding in musical surprises.',
    discoveryProgress: (earned, total) => `${earned} / ${total} met`,
    discoveryFound: 'A sound creature appeared!',
    discoveryFocusHint: 'This creature was hiding in the glowing notes and rhythms.',
    discoveryAhaLabel: 'Oh, I get it!',
    discoveryAcknowledge: 'Got it!',
    discoveryLocked: '???',
    discoveryCreatureLocked: 'Not met yet',
    discoveryCreatureMet: 'Met!',
    discoveryEntryNumber: (number) => `No. ${String(number).padStart(2, '0')}`,
    discoveryHintLabel: 'Try this',
    discoveryCreatureReasonLabel: 'Why did it appear?',
    discoveryTheoryLabel: 'Music words',
    discoveryDate: (date) => `Met ${date}`,
    discoveryGuestNotice: 'This guide remembers creatures you meet for this browser session.',
    discoveryLoginToKeep:
      'Creatures you meet after logging in are saved to your guide on your other devices too.',
    discoverySyncError: "Some creatures haven't been saved to your guide yet.",
    discoveryRetry: 'Try again',
    creatures: {
      interval_third: {
        name: 'Mitts',
        personality: 'Loves singing with two notes that are a little apart.',
        reveal: 'Two notes lit up together!',
        description: 'The two glowing notes are 3 or 4 half-steps apart.',
        hint: 'Move either note a little and listen for a place where they softly fit together.',
        theory:
          'C to E and D to F are both called thirds: count the note names from the lower note, including both ends—C, D, E makes three. A third can span 3 or 4 half-steps.',
        alt: 'Mitts, a round purple creature with large coral ears divided into different numbers of segments.',
      },
      open_fifth: {
        name: 'Nobeen',
        personality: 'A calm listener who loves calling out in wide-open places.',
        reveal: 'The sound opened up!',
        description: 'The glowing notes are separated by a wide, even-sounding distance.',
        hint: 'Try the same shape higher or lower.',
        theory:
          'C to G is a perfect fifth: count C, D, E, F, G, and the notes are 7 half-steps apart. C to the next C is an octave, 12 half-steps. Both often sound open and stable.',
        alt: 'Nobeen, a blue creature stretching wide yellow sound fins to both sides.',
      },
      close_tension: {
        name: 'Bururi',
        personality: 'Shivers when notes get very close, then leans in to listen again.',
        reveal: 'The sound gave a little shiver!',
        description: 'The two glowing notes sit right next to each other on the keyboard.',
        hint: 'Use this sound when something strange or scary is about to happen.',
        theory:
          'The distance from one key to the very next key—white or black—is one half-step, also called a semitone. Playing those neighbors together creates strong tension.',
        alt: 'Bururi, a rounded red creature with two close blue sound horns and wavy sides.',
      },
      stepwise_run: {
        name: 'Tokotoko',
        personality: 'An explorer who walks from one neighboring note to the next.',
        reveal: 'A staircase appeared!',
        description: 'Four glowing notes moved in one direction, each only 1 or 2 half-steps away.',
        hint: 'How long can you make the staircase?',
        theory:
          'Moving from one nearby note to the next—like C, D, E, F—is called stepwise motion. Because there are no big jumps, the melody sounds smooth and easy to follow.',
        alt: 'Tokotoko, climbing diagonally on a green four-step body and four orange feet.',
      },
      call_and_response: {
        name: 'Yobikota',
        personality: 'A careful listener who answers every call in the same way.',
        reveal: 'The sounds answered each other!',
        description:
          'A three-note shape returned after a short pause, with the same rhythm and motion.',
        hint: 'Make the answer start on a different note.',
        theory:
          'The first shape is the call and the repeated shape is the response. The answer may start higher or lower, but keeping the same rhythm and up-and-down motion makes the connection audible.',
        alt: 'Yobikota, an orange creature with two facing faces and matching sets of three blue marks.',
      },
      rest_then_burst: {
        name: 'Tamepon',
        personality: 'Waits quietly, then bursts out with joy when the sounds arrive.',
        reveal: 'The quiet made the next sound burst!',
        description:
          'One whole beat stayed silent, then at least three sounds began in the next beat.',
        hint: 'Try making the quiet part even longer.',
        theory:
          'Written silence is called a rest. A rest creates anticipation, so several sounds arriving just after it can feel stronger—like taking a breath before speaking.',
        alt: 'Tamepon, a blue three-layered creature popping three round purple sound sprouts upward.',
      },
      rhythm_loop: {
        name: 'Gurutan',
        personality: 'Gets excited by a familiar step and happily goes around again.',
        reveal: 'The rhythm started an engine!',
        description: 'Two or more sounds used the same timing and lengths again in the next beat.',
        hint: 'Keep the rhythm but change the pitches.',
        theory:
          'Rhythm is the pattern of when sounds begin and how long they last. When that pattern repeats, it can become an ostinato—the steady engine underneath a song.',
        alt: 'Gurutan, a yellow ring-shaped creature with a large center opening and matching pink marks.',
      },
      sustain_contrast: {
        name: 'Nobichoko',
        personality: 'Stretches one voice out, then takes two quick little steps.',
        reveal: 'A long sound left a sparkling trail!',
        description: 'A note held for at least one beat was followed by two quick, one-cell notes.',
        hint: 'Swap the order: what happens when short notes come first?',
        theory:
          'A held note feels spacious, while short notes feel active. Putting different note lengths next to each other is called rhythmic contrast, and it gives a phrase shape and motion.',
        alt: 'Nobichoko, a brown creature with a long pink voice-tail and two short blue feet.',
      },
    },
    challengeOpen: 'Try a prompt',
    challengePickerTitle: 'Choose a sound world',
    challengePickerIntro:
      'There is no single right answer. Pick the scene that makes you want to create.',
    challengeRandom: 'Surprise me',
    challengeActive: 'Your prompt',
    challengeDone: 'Done!',
    challengeExit: 'Leave prompt',
    challengeWorldWaiting: 'Press Play and the world will answer your sounds.',
    challengeCompleteTitle: 'You made your sound world!',
    challengeCompleteIntro:
      'Here are some of the musical ideas your song was using. They are clues, not a score.',
    challengeIdeasTitle: 'Ideas in your music',
    challengeIdeasEmpty:
      'This world is still quiet. You can keep it that way, or add a sound and listen again.',
    challengeKeepCreating: 'Keep creating',
    challengeChooseAnother: 'Try another prompt',
    challengeCards: {
      rain: {
        title: 'Sounds of Rain',
        prompt: 'What kind of rain is falling? Move the sky and puddles with sound.',
        sceneLabel: 'A rainy world that responds to the music',
      },
      ghost: {
        title: 'A Ghost Is Coming',
        prompt: 'You cannot see it yet. How does your ghost come closer?',
        sceneLabel: 'A ghostly world that responds to the music',
      },
      run: {
        title: 'On the Run',
        prompt: 'Where are they going, and how are they moving? Make the path come alive.',
        sceneLabel: 'A running world that responds to the music',
      },
    },
    challengeTechniques: {
      rain_droplets: 'High, short notes made little raindrops.',
      rain_downpour: 'Layered sounds made the rain grow stronger.',
      rain_ripples: 'Long notes spread rings across the water.',
      rain_thunder: 'Kick-drum sounds rolled like thunder.',
      rain_clearing: 'Quiet spaces opened gaps in the clouds.',
      rain_wind: 'Notes moving upward lifted the wind.',
      ghost_shadow: 'Low notes made the shadow grow.',
      ghost_shiver: 'Neighboring notes sounding together made the world shiver.',
      ghost_approach: 'Layered sounds brought the ghost closer.',
      ghost_surprise: 'A sound after silence made the ghost appear suddenly.',
      run_stride: 'Evenly repeating sounds created a steady stride.',
      run_fast: 'A quick tempo sped up the journey.',
      run_footsteps: 'Drum sounds became footsteps on the path.',
      run_uphill: 'Notes moving upward turned the path uphill.',
      run_jump: 'Long notes lifted the runner into a jump.',
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
    authorAccountLabel: 'アカウント',
    authorAccountNone: 'アカウントなし（だれか わかりません）',
    authorAccountDiffers: '入力された なまえと ちがいます',
    saveVisibleToTeacher: '先生には、だれが つくったか 見えるよ。',
    teacherLink: '先生ページ',
    teacherTitle: '先生ページ',
    teacherIntro: '公開された曲のみ表示しています（下書きは児童の私的な作業のため含みません）。',
    teacherSearch: '曲名・なまえ・アカウントで さがす',
    teacherFilterAll: 'すべて',
    teacherFilterReview: '要確認',
    teacherFilterHidden: '非表示にした曲',
    teacherReviewCount: (n) => `要確認 ${n}件`,
    teacherReasonNameMismatch: '入力名がアカウントと一致しません',
    teacherReasonAnonymous: 'アカウントなし（特定できません）',
    teacherColTitle: '曲',
    teacherColAccount: 'アカウント',
    teacherColClass: 'クラス',
    teacherColUpdated: '更新',
    teacherColActions: '',
    teacherTypedAs: (name) => `入力名「${name}」`,
    teacherOpen: '開く',
    teacherHide: '非表示にする',
    teacherUnhide: '再表示する',
    teacherHiddenBadge: '非表示',
    teacherEmpty: '該当する曲がありません。',
    teacherLoadError: '曲を読み込めませんでした。ページを再読み込みしてください。',
    teacherSongCount: (n) => `${n}曲`,
    teacherShowEmails: 'メールを表示',
    teacherHideEmails: 'メールを隠す',
    teacherEmailsHiddenNote: 'メール非表示中 — 教室の画面に映しても大丈夫です。',
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
    discoveriesLink: 'ずかん',
    discoveryAlbumTitle: 'おとのずかん',
    discoveryAlbumIntro: '音をつくって、よくきいて。音の中にかくれた生き物とであおう。',
    discoveryProgress: (earned, total) => `${earned} / ${total} と であった`,
    discoveryFound: 'おとのいきものと であった！',
    discoveryFocusHint: 'ひかっている音やリズムに、この生き物がかくれていたよ。',
    discoveryAhaLabel: 'へぇ、なるほど！',
    discoveryAcknowledge: 'わかった！',
    discoveryLocked: '？？？',
    discoveryCreatureLocked: 'まだ であっていない',
    discoveryCreatureMet: 'であった！',
    discoveryEntryNumber: (number) => `ずかん ${String(number).padStart(2, '0')}`,
    discoveryHintLabel: 'ためしてみよう',
    discoveryCreatureReasonLabel: 'どうして あらわれたの？',
    discoveryTheoryLabel: '音楽のことば',
    discoveryDate: (date) => `${date} に であった`,
    discoveryGuestNotice:
      'このブラウザをひらいているあいだ、であった生き物をずかんがおぼえているよ。',
    discoveryLoginToKeep:
      'ログインしてからであった生き物は、つぎにひらいたときや別の端末のずかんでも見られるよ。',
    discoverySyncError: 'まだ ずかんに ほぞんできていない生き物がいるよ。',
    discoveryRetry: 'もういちど',
    creatures: {
      interval_third: {
        name: 'ミッツ',
        personality: '少しはなれた2つの音と、いっしょに歌うのが大好き。',
        reveal: 'ふたつの音が いっしょに光った！',
        description: 'ひかった2音は、となりのけんばんへ1つずつ進むと、3歩か4歩のきょりだよ。',
        hint: 'どちらかの音をすこし動かして、ふわっとひびく場所をさがしてみよう。',
        theory:
          'けんばんですぐとなりへ進む1歩を「半音」というよ。ド→ミ、レ→ファのように、低い音から両はしを入れて3つ数えるきょりが「3度」。3度には、半音3つぶんと4つぶんがあるんだ。',
        alt: '紫の丸い体と、左右で節の数が異なる珊瑚色の大きな耳を持つ、ミッツ',
      },
      open_fifth: {
        name: 'ノビーン',
        personality: '広いところでのびのび鳴く、のんびりした聞き上手。',
        reveal: '音のむこうに 空がひらいた！',
        description: 'ひかった2音が、ひろく安定して聞こえるきょりにあるよ。',
        hint: '同じかたちを、もっと高いところや低いところでためしてみよう。',
        theory:
          'ド→ソは「ド・レ・ミ・ファ・ソ」と5つ数えるので「完全5度」。けんばんでは7歩ぶんだよ。ド→高いドは12歩ぶんの「オクターブ」。どちらも、ひろく安定して聞こえやすいんだ。',
        alt: '青い体から黄色い音のひれを左右へ大きく広げた、ノビーン',
      },
      close_tension: {
        name: 'ブルリ',
        personality: '近すぎる音にびっくりして、もう一度聞きたがる好奇心いっぱいの子。',
        reveal: '音が ぶるっとふるえた！',
        description: 'ひかった2音は、けんばんですぐとなりどうしだよ。',
        hint: 'ふしぎなことや、こわいことが起こる前の音に使ってみよう。',
        theory:
          '白いけんばんも黒いけんばんもふくめて、すぐとなりまでのきょりを「半音」というよ。半音となりの2音をいっしょに鳴らすと、つよい緊張感が生まれるんだ。',
        alt: '赤い丸四角の体に、近く並ぶ水色の音のつのと波打つ体側を持つ、ブルリ',
      },
      stepwise_run: {
        name: 'トコトコ',
        personality: 'となりの音へ一歩ずつ進み、つぎの場所を見つけるのが好きな探検家。',
        reveal: '音のかいだんが あらわれた！',
        description: 'ひかった4音が、けんばん1歩か2歩ずつ、同じ向きへ進んだよ。',
        hint: 'どこまで長いかいだんを作れるかな？',
        theory:
          'ド・レ・ミ・ファのように、となりに近い音へ少しずつ進む動きを「順次進行」というよ。大きくジャンプしないので、なめらかなメロディーに聞こえるんだ。',
        alt: '緑の4段の体とオレンジ色の4本の足で斜め上へ歩く、トコトコ',
      },
      call_and_response: {
        name: 'ヨビコタ',
        personality: 'よびかけを聞きのがさず、同じ調子でへんじする聞き上手。',
        reveal: '音どうしが おへんじした！',
        description: '3音のかたちが少し間をあけて、同じリズムと動きでもう一度あらわれたよ。',
        hint: 'へんじのはじまりを、ちがう高さにしてみよう。',
        theory:
          'さいしょのかたちが「よびかけ」、つぎのかたちが「へんじ」。へんじの高さがちがっても、リズムとのぼりおりが同じなら、つながって聞こえるんだ。',
        alt: '上下で向き合う2つの顔と、同じ3つずつの水色の印を持つオレンジ色のヨビコタ',
      },
      rest_then_burst: {
        name: 'タメポン',
        personality: 'しずかな時間をじっと味わい、音が来るとよろこんで飛び出す。',
        reveal: 'しずけさのあとで 音がはじけた！',
        description: 'まるまる1ぱく休んだあと、つぎの1ぱくで3つ以上の音がはじまったよ。',
        hint: 'しずかなところを、もっと長くしたらどうなるかな？',
        theory:
          '音を鳴らさない時間を「休符」というよ。休符があると「つぎは何だろう？」と感じるので、そのあとに音が集まると、より強く聞こえるんだ。',
        alt: '青い3段の体から紫の3つの丸い音の芽を飛び出させた、タメポン',
      },
      rhythm_loop: {
        name: 'グルタン',
        personality: '同じ足どりを見つけると、うれしくなって何周でも楽しむ。',
        reveal: 'リズムのエンジンが うごきだした！',
        description: '2つ以上の音のタイミングと長さが、つぎの1ぱくでも同じになったよ。',
        hint: 'リズムはそのままで、音の高さだけかえてみよう。',
        theory:
          '音が「いつ始まり、どれだけ続くか」のならびがリズム。そのかたちをくりかえすと、曲を動かすエンジンのような「オスティナート」になることがあるよ。',
        alt: '大きな穴のある黄色い輪の体に、左右同じ並びのピンク色の印を持つ、グルタン',
      },
      sustain_contrast: {
        name: 'ノビチョコ',
        personality: 'ひとつの声をゆっくりのばしたあと、軽い足どりで二歩進む。',
        reveal: '長い音が きらきらのあとをのこした！',
        description: '1ぱく以上のばした音のあとに、1マスの短い音が2つつづいたよ。',
        hint: 'こんどは、短い音をさきにしたらどう聞こえるかな？',
        theory:
          '長い音はゆったり、短い音は活発に感じやすいよ。ちがう長さをとなり合わせる「リズムの対比」で、音楽にかたちや動きが生まれるんだ。',
        alt: '左へ長く伸びる桃色の声の尾と、2本の短い水色の足を持つ茶色のノビチョコ',
      },
    },
    challengeOpen: 'お題にちょうせん',
    challengePickerTitle: '音のせかいを えらぼう',
    challengePickerIntro: 'せいかいは ひとつじゃないよ。音にしてみたい せかいをえらんでね。',
    challengeRandom: 'おまかせで ひく',
    challengeActive: 'いまのお題',
    challengeDone: 'できた！',
    challengeExit: 'お題をやめる',
    challengeWorldWaiting: 'えんそうすると、せかいが音にこたえるよ。',
    challengeCompleteTitle: '音のせかいが できた！',
    challengeCompleteIntro:
      'この曲でつかっていた 音のくふうを見つけたよ。点数ではなく、曲をもう一度きくためのヒントだよ。',
    challengeIdeasTitle: 'この曲にあった 音のくふう',
    challengeIdeasEmpty:
      'いまは しずかなせかいだね。このままでも、音をたして もう一度きいてもいいよ。',
    challengeKeepCreating: 'もうすこし つくる',
    challengeChooseAnother: 'べつのお題へ',
    challengeCards: {
      rain: {
        title: 'あめの音',
        prompt: 'どんな雨が ふっている？ 音で空と水たまりを うごかそう。',
        sceneLabel: '音にこたえて うごく雨のせかい',
      },
      ghost: {
        title: 'おばけが ちかづいてくる',
        prompt: 'まだ見えない おばけ。どんなふうに ちかづいてくる？',
        sceneLabel: '音にこたえて うごくおばけのせかい',
      },
      run: {
        title: '走っている感じ',
        prompt: 'どこへ、どんなふうに走る？ 音で道を うごかそう。',
        sceneLabel: '音にこたえて うごく走るせかい',
      },
    },
    challengeTechniques: {
      rain_droplets: '高い短い音で、小さな雨つぶを作っていたね。',
      rain_downpour: '音をかさねて、雨をつよくしていたね。',
      rain_ripples: '長い音で、水のわを広げていたね。',
      rain_thunder: 'キックの音で、かみなりを鳴らしていたね。',
      rain_clearing: '音のないところで、雲のすきまを作っていたね。',
      rain_wind: '音を上へ動かして、風を起こしていたね。',
      ghost_shadow: '低い音で、おばけの影を大きくしていたね。',
      ghost_shiver: 'となりあう音をかさねて、せかいを ぶるっとさせていたね。',
      ghost_approach: '音をかさねて、おばけを近づけていたね。',
      ghost_surprise: 'しずけさのあとの音で、おばけを急に出していたね。',
      run_stride: '同じ間かくの音で、走る足どりを作っていたね。',
      run_fast: 'はやいテンポで、走る速さを上げていたね。',
      run_footsteps: 'ドラムの音を、道をける足音にしていたね。',
      run_uphill: '音を上へ動かして、のぼり道を作っていたね。',
      run_jump: '長い音で、走る人をジャンプさせていたね。',
    },
  },
};
