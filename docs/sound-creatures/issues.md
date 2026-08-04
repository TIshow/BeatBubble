# GitHub Issue対応表

| 役割               | Issue                                                                                                        | 対応する仕様                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| 統括               | [#121 — はっけんカードを「おとのいきもの図鑑」へ発展させる](https://github.com/TIshow/BeatBubble/issues/121) | `README.md`、全タスク          |
| 完了               | [#122 — 代表キャラクター1体とアートスタイルを確定する](https://github.com/TIshow/BeatBubble/issues/122)      | `tasks/01-style-prototype.md`  |
| 完了               | [#124 — 残り7体のキャラクターアートを制作する](https://github.com/TIshow/BeatBubble/issues/124)              | `tasks/02-roster-art.md`       |
| 完了               | [#128 — 発見IDと生き物を結ぶ表示カタログを実装する](https://github.com/TIshow/BeatBubble/issues/128)         | `tasks/03-creature-catalog.md` |
| 完了               | [#129 — 未発見シルエットと発見済みの生き物を表示する](https://github.com/TIshow/BeatBubble/issues/129)       | `tasks/04-encyclopedia-ui.md`  |
| 完了               | [#130 — 初回発見を生き物との出会い演出へ変更する](https://github.com/TIshow/BeatBubble/issues/130)           | `tasks/05-discovery-reveal.md` |
| 実装完了・確認待ち | [#133 — 見つけた生き物を編集画面へ連れて行く](https://github.com/TIshow/BeatBubble/issues/133)               | `tasks/06-editor-companion.md` |

#124では、承認済みスタイルを使って残りの生き物を1体ずつ制作し、2026-08-04に
全8体の人手承認と変更の統合を完了した。次も検証結果を反映してから、実行する
1件だけをIssue化する。

## 現在のタスク

Task 05までPR #131で`main`へ統合し、Production反映まで完了した。Task 06はIssue #133で
実装を終え、DB migration適用と人手確認を待っている。Task 07はTask 06の利用確認と
別途承認まで開始しない。
