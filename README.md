# BeatBubble

Chrome Music Lab の Song Maker にインスパイアされた、教室向けグリッドベースの作曲アプリ。

## 特徴

- **グリッド編集**: タップ/クリックで短音入力、ドラッグで長音（持続音）入力
- **メロディ + ドラム**: 音階パート（C4–C5 など）と打楽器パート（kick, snare, hihat）
- **リアルタイム再生**: Web Audio API による先読みスケジューリング（ループ再生・プレイヘッド表示）
- **音色選択**: メロディ音色を 4 種類から選択可能（Piano / Synth / Marimba / Flute）
- **Undo**: ノート操作を最大 50 件遡って取り消し
- **音域調整**: チップ型 UI で表示・入力可能な音域を動的に変更（C2–C7）
- **音符フィルター**: 使用する音符を個別に ON/OFF して音階を制限
- **テンポ制御**: 40–200 BPM のスライダー
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

## ページ構成

| パス | 内容 |
|------|------|
| `/` | 作曲エディタ |
| `/songs` | みんなの曲一覧（SNS 風フィード） |

保存した曲は `/songs` に表示され、「あそぶ」ボタンで `/?load=<id>` 経由でエディタに読み込まれます。

## 技術スタック

- Next.js 16 (App Router) / React 19
- TypeScript (strict)
- Web Audio API（複数音色シンセ + ドラム合成、外部ライブラリ不使用）
- Supabase（曲データの保存・取得）

## プロジェクト構成

```
src/
├── app/
│   ├── components/   # SaveModal, NotePanel
│   ├── songs/        # みんなの曲一覧ページ
│   ├── layout.tsx
│   ├── page.tsx      # 作曲エディタ
│   └── globals.css
├── core/             # 型定義・純粋関数による状態操作（DOM/Audio 非依存）
├── audio/            # Web Audio エンジン（先読みスケジューリング）
├── ui/               # 色・グリッド表示ヘルパー
├── hooks/            # カスタムフック（タップ/ドラッグ操作、ロケール）
└── lib/              # Supabase クライアント、i18n 翻訳定義
```

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
