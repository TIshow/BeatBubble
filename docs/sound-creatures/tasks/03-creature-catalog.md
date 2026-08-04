# Task 03 — 発見IDと生き物を結ぶ表示カタログを実装する

## 状態

実装完了・統合待ち。Issue #128、commit `e47ff79` で、全8体の型安全な表示カタログ、
日英コピー、画像・翻訳の対応を検証する単体テストを追加した。人の確認を経てTask 04を
開始済み。

## 目的

発見ロジックに画像責務を混ぜず、すべての `DiscoveryId` を型安全に
キャラクター表現へ変換できる表示ドメインを追加する。

## 先に読むもの

- `AGENTS.md`
- `docs/sound-creatures/README.md`
- `docs/sound-creatures/style-guide.md`
- `src/discovery/types.ts`
- `src/discovery/catalog.ts`
- `src/lib/i18n.ts`

## 実装要件

- `src/creatures/types.ts` と `src/creatures/catalog.ts` を追加する。
- `DiscoveryId` ごとに画像パス、演出種別、表示上必要なキーを対応させる。
- 対応漏れをコンパイルまたはテストで検出できる網羅的な型にする。
- 固有名、説明、ヒント、alt文を日本語・英語の両方に追加する。
- 発見判定・永続化の公開契約は変更しない。
- カタログの単体テストを追加する。

## 対象外

- 図鑑画面の見た目変更
- モーダル演出
- 発見条件の調整
- DB変更

## 合格条件

- 8つの `DiscoveryId` の対応漏れがない。
- 画像パスと翻訳キーの誤りをテストで検出できる。
- `src/discovery/*` が `src/creatures/*` に依存しない。
- 日本語・英語の型検査、lint、関連テストが通る。
