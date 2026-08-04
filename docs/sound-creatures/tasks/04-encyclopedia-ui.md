# Task 04 — はっけんアルバムを「おとのずかん」へ変更する

## 状態

Task 03完了待ち。

## 目的

既存の `/discoveries` を、未発見は固有シルエット、発見済みは生き物の全身と
学びを表示する図鑑体験へ変更する。

## 先に読むもの

- `AGENTS.md`
- `docs/sound-creatures/README.md`
- `src/app/discoveries/page.tsx`
- `src/app/components/discovery/DiscoveryCard.tsx`
- `src/app/components/discovery/DiscoveryAlbumProgress.tsx`
- `src/app/styles/discoveries.css`
- `src/lib/i18n.ts`

## 実装要件

- 児童向け文言を「おとのいきもの」「おとのずかん」「であった」に変更する。
- 未発見では同じportrait画像をCSSでシルエット化する。
- 未発見では正式名、色、説明をアクセシブルネームからも漏らさない。
- 発見済みでは全身、名前、性格、理由、音楽のことば、発見日を表示する。
- 「音楽のことば」は常時表示し、開閉UIを設けない。
- light/dark、desktop/tablet/mobile、`prefers-reduced-motion` に対応する。
- 画像読込失敗時にもテキスト内容へ到達できる。

## 対象外

- 発見判定の変更
- 初回発見モーダルの変更
- 相棒選択
- DBマイグレーション

## 合格条件

- 既存の発見済みデータがそのまま生き物の解放状態として表示される。
- 未発見と発見済みが色だけでなく形・文言でも区別できる。
- 未発見の名前をDOMやalt文から読み取れない。
- 日英切替ですべての新規文言が切り替わる。
- 各ブレークポイントとキーボード操作を手動確認している。
- lint、型検査、関連テストが通る。
