# BeatBubble

Chrome Music Lab の Song Maker にインスパイアされた、教室向けグリッドベースの作曲アプリ。

## 特徴

- **グリッド編集**: タップ/クリックで短音入力、ドラッグで長音（持続音）入力
- **メロディ + ドラム**: 音階パート（C4–C5 など）と打楽器パート（kick, snare, hihat）
- **リアルタイム再生**: Web Audio API による先読みスケジューリング（ループ再生・プレイヘッド表示）
- **音色選択**: メロディ音色を 4 種類から選択可能（Piano / Synth / Marimba / Flute）
- **Undo**: ノート操作を最大 50 件遡って取り消し
- **音域調整**: チップ型 UI で表示・入力可能な音域を動的に変更（C2–C7）
- **テンポ制御**: 40–200 BPM のスライダー
- **レスポンシブ対応**: デスクトップ・タブレット・スマホに最適化（タッチ操作対応）

## 操作

| 操作 | 動作 |
|------|------|
| 空セルをクリック | メロディノート追加（duration=1） |
| ノートをクリック | ノート削除 |
| ノート始点からドラッグ | 持続時間を変更 |
| ドラム行をクリック | ヒットのトグル |

## 技術スタック

- Next.js 16 (App Router) / React 19
- TypeScript (strict)
- Web Audio API（複数音色シンセ + ドラム合成、外部ライブラリ不使用）

## プロジェクト構成

```
src/
├── app/          # Next.js App Router (page, layout, styles)
├── core/         # 型定義・純粋関数による状態操作（DOM/Audio 非依存）
├── audio/        # Web Audio エンジン（先読みスケジューリング）
├── ui/           # 色・グリッド表示ヘルパー
└── hooks/        # カスタムフック（タップ/ドラッグ操作）
```

## 開発

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm lint       # ESLint
pnpm format     # Prettier
```
