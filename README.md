# BeatBubble

Chrome Music Lab の Song Maker にインスパイアされた、教室向けグリッドベースの作曲アプリ。

## 特徴

- **グリッド編集**: タップ/クリックで短音入力、ドラッグで長音入力
- **メロディ + ドラム**: 音階パート（C4–C5など）と打楽器パート（hihat, snare, kick）
- **リアルタイム再生**: Web Audio API によるシンセサイザー音源
- **音域調整**: Range コントロールで表示・入力可能な音域を変更
- **レスポンシブ対応**: デスクトップ、タブレット、スマホに最適化されたUI

## 技術スタック

- Next.js 16 (App Router)
- TypeScript
- Web Audio API

## プロジェクト構成

```
src/
├── app/          # Next.js App Router (page.tsx, globals.css)
├── core/         # 型定義、状態操作、ユーティリティ
├── audio/        # Web Audio エンジン
├── ui/           # 色・グリッド表示ヘルパー
└── hooks/        # カスタムフック（タップ/ドラッグ操作）
```

## 開発

```bash
pnpm install
pnpm dev
```

http://localhost:3000 でアプリが起動します。
