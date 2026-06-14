# BeatBubble

Chrome Music Lab の Song Maker にインスパイアされた、教室向けグリッドベースの作曲アプリ。

## 特徴

- **グリッド編集**: タップ/クリックで短音入力、ドラッグで長音（持続音）入力
- **メロディ + ドラム**: 音階パートと打楽器パート（kick, snare, hihat）
- **ドレミ表記**: 日本語表示では音名をドレミ（ド・レ・ミ…）、英語表示では ABC（C, D, E…）で表示
- **リアルタイム再生**: Web Audio API による先読みスケジューリング（ループ再生・プレイヘッド表示）
- **音色選択**: メロディ音色を 4 種類から選択可能（Piano / Synth / Marimba / Flute）
- **Undo**: ノート操作を最大 50 件遡って取り消し
- **音域調整**: チップ型 UI で表示・入力可能な音域を動的に変更（C2–C7）
- **黒鍵（半音）トグル**: 設定で黒鍵（♯/♭）の表示・入力を ON/OFF
- **長さ調整**: グリッドの横幅を「ブロック」単位で増減（1 ブロック = 1 拍 = 4 マス）。授業に合わせて短く・長く
- **音符フィルター**: 使用する音符を個別に ON/OFF して音階を制限
- **テンポ制御**: 40–200 BPM のスライダー
- **設定パネル**: テンポ・音色・音域・ブロック数・黒鍵・使う音・リセットを「⚙ せってい」パネルに集約（リセットは確認ステップ付き）
- **曲の保存・共有**: Supabase に保存し、みんなの曲一覧ページで共有
- **日本語 / 英語切り替え**: 各ページにロケールトグル（localStorage で永続化）
- **レスポンシブ対応**: デスクトップ・タブレット・スマホに最適化（タッチ操作対応）

## 操作

| 操作 | 動作 |
|------|------|
| 空セルをクリック | メロディノート追加（duration=1） |
| ノートをクリック | ノート削除 |
| ノート始点からドラッグ | 持続時間を変更 |
| ドラム行をクリック | ヒットのトグル |
| ⚙ せってい | 設定パネルの開閉 |

## ページ構成

| パス | 内容 |
|------|------|
| `/` | 作曲エディタ |
| `/songs` | みんなの曲一覧（SNS 風フィード） |

保存した曲は `/songs` に表示され、「あそぶ」ボタンで `/?load=<id>` 経由でエディタに読み込まれます。古い形式で保存された曲は読み込み時に現行モデルへ自動移行されます。

## 技術スタック

- Next.js 16 (App Router) / React 19
- TypeScript (strict)
- Web Audio API（複数音色シンセ + ドラム合成、外部ライブラリ不使用）
- Supabase（曲データの保存・取得）

## プロジェクト構成

```
src/
├── app/
│   ├── components/   # Header, SettingsPanel, Grid, NotePanel, SaveModal
│   ├── songs/        # みんなの曲一覧ページ
│   ├── styles/       # 機能別に分割したグローバル CSS（base/header/settings/grid/…）
│   ├── layout.tsx
│   ├── page.tsx      # 作曲エディタ（状態の配線とコンポーネント合成）
│   └── globals.css   # styles/ を @import するエントリ
├── core/             # 型定義・純粋関数による状態操作 + 旧データ移行（DOM/Audio 非依存）
├── audio/            # Web Audio エンジン（先読みスケジューリング）
├── ui/               # 色・グリッド表示・音名表記（ドレミ）ヘルパー
├── hooks/            # カスタムフック（曲状態+履歴、タップ/ドラッグ操作、ロケール）
└── lib/              # Supabase クライアント、i18n 翻訳定義
```

### 設計上の約束

- `src/core/*` は **純粋・不変**（DOM/AudioContext/時刻に非依存）
- 音高は **音名文字列**（`"C4"`, `"F#3"` など）で保持
- 持続音は **1 ノート + durationSteps** で表現（セル複製はしない）
- グリッド長は `totalSteps(song)` から導出（`blocks × stepsPerBeat`）。再生・グリッド描画ともここを参照
- AudioContext の生成/再開は **ユーザー操作（再生ボタン）起点**

## 環境変数

Vercel（または `.env`）に以下を設定してください：

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## 開発

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm lint       # ESLint
pnpm format     # Prettier
```
