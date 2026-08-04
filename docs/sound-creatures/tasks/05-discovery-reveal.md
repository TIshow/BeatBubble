# Task 05 — 初回発見を「生き物との出会い」へ変更する

## 状態

Task 04完了待ち。

## 目的

現在の「再生停止 → 証拠ハイライト → わかった！」という安全な流れを維持しながら、
カード獲得ではなく、生き物が音から現れたと感じる演出へ変更する。

## 先に読むもの

- `AGENTS.md`
- `docs/sound-creatures/README.md`
- `src/app/components/discovery/DiscoveryRevealModal.tsx`
- `src/app/components/discovery/DiscoveryEvidenceOverlay.tsx`
- `src/app/components/discovery/DiscoveryToast.tsx`
- `src/hooks/useDiscoveryFeedback.ts`
- 関連する発見演出テスト

## 実装要件

- 初回発見時だけ再生を止め、証拠位置を明示する。
- 生き物のportrait、名前、現れた理由、音楽のことばを表示する。
- 子どもが「わかった！」を押すまで閉じない。
- 閉じた後は元の編集操作とフォーカスへ安全に戻す。
- 再発見では操作を止めず、短い非モーダル反応だけを出す。
- `prefers-reduced-motion` では派手な移動や拡大を省く。
- 音やアニメーションがなくても意味が伝わる。

## 対象外

- 発見ルールの追加・変更
- 相棒機能
- AI機能
- DB変更

## 合格条件

- 初回と再発見の分岐が既存の永続化状態に基づいて正しく動く。
- 初回発見中は誤操作や多重モーダルが起きない。
- 再発見は再生や編集を中断しない。
- 証拠ハイライトが各 `DiscoveryEvidence` 種別で正しく表示される。
- キーボード、画面幅、motion設定を含む手動確認を行っている。
- lint、型検査、関連テストが通る。
