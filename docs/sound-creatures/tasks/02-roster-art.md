# Task 02 — 残り7体のキャラクターアートを制作する

## 状態

2026-08-04に制作・人手承認・変更の統合を完了。8体の画像、設定、小サイズ表示、
相互に異なるシルエットを確認済み。

## 目的

承認済みのスタイルを崩さず、残り7つの `DiscoveryId` に対応する生き物を制作する。

## 先に読むもの

- `AGENTS.md`
- `docs/sound-creatures/README.md`
- `docs/sound-creatures/creature-roster.md`
- `docs/sound-creatures/style-guide.md`
- `src/discovery/catalog.ts`

## 必須手順

1. `imagegen` skillの指示に従う。
2. 1度に全体を確定せず、まず2体を作ってスタイルの再現性を確認する。
3. 2体の確認後に残り5体を制作する。
4. 8体を並べ、輪郭、配色、顔、身体構造の重複を確認する。
5. 各個体を96px相当でも確認する。

## 変更してよい範囲

- `public/creatures/<discovery-id>/portrait.png`
- `docs/sound-creatures/creature-roster.md` の正式名称・確定事項
- `docs/sound-creatures/style-guide.md` の再現性に必要な追記

## 対象外

- React/CSSへの組み込み
- 発見判定の変更
- DBマイグレーション
- 追加の発見種類
- レア度や進化などのゲームシステム

## 合格条件

- 8つの既存 `DiscoveryId` すべてに1体ずつ画像がある。
- どの個体もシルエットだけで相互に区別できる。
- 音の性質と身体的特徴の対応を1文で説明できる。
- 全個体が承認済みスタイルガイドに従う。
- 特定の既存作品を想起させる固有特徴がない。

## 停止条件

8体の一覧を提示し、人が全体の統一感と各個体の独自性を承認するまでTask 03へ進まない。
