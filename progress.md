# 進捗

## 2026-11-27 — 事前調査
- 元Issue #12、ハブの開発規約、立体書影のAGENTS、JTD WASM API・ビルド手順、ag-psd、pscat、統合ビュワーの対応表を確認。
- 調査・仕様・形式判定モジュールと合成テストを追加。

## 2026-11-27 — 検証基盤の追加
- PSD/PDF/EPS/TIFF等の合成9ファイルを再現生成するスクリプト、参照描画スクリプト、追加の構造テストを追加。
- Pillow・PyMuPDF・Ghostscriptで合成素材の7参照描画が期待通り。候補レンダラー本体の描画テストとは別。
- pscat の実行上限API、JTDのHTML挿入リスクを確認。docs/VALIDATION.mdに記録。
- npmレジストリ名前解決失敗のため、実際のJS/WASM依存導入とブラウザ検証は未実施。
- 次: P0のライブラリ比較、真正ファイル比較、配布ライセンス確認。

## セッション管理・テスト
- src/session.mjs: ファイル切替・ページ描画のAbortSignal、世代管理、古い描画結果の破棄、エラー伝播。Worker自体の停止とリソース解放は各アダプターが実装する。
- 合成形式判定19件、試料構造4件、セッション6件の計29件がローカルNode22.16.0で成功。GitHub Actionsの結果は未確認。
- 依存なしの暫定CIを追加。UI導入時に組織共通テンプレートに統合する。

## MVP実装
- PR #2をCI成功後にmainへマージ。
- PR #3で共通UI、PDF.js/ag-psd/UTIF/pscat/JTD接続、上限ガード、ブラウザ統合CIを追加。npm依存とlockは取得済み。
- Ubuntu 26.04とPlaywrightの不整合をUbuntu 24.04固定で解消。最初のブラウザ試験はPDFキャンバス待ちで失敗、形式別診断を追加して再試験。
- JTDはWASMビルド・合成文書本文ラウンドトリップをCIで検証する。ページレイアウトは未実装。公開・ハブ登録は未実施。

- CI run 45925582157: Node 42件成功。ChromiumでPSD、TIFF、EPS本体、EPS埋込TIFF、PNGの5描画に成功。PDF/AIはMap#getOrInsertComputed非対応。PDF.jsをlegacy/buildへ変更し再検証。

- PR #3は全CI成功後に main へマージ（49f11fa）。PDF・AI含む合成描画、JTD本文表示が成功。
- 次段階: 上流JTDのMIT描画コードをWorker向けに適応し、ページ近似表示とTIFFページ切替を追加。新CI結果待ち。

## 対応形式拡張
- PR #6は全CI成功後mainへマージ（a2215fc）。PC/スマホ4プロファイルの閲覧操作が成功。
- PR #8: illustrator-pgf 0.1.0原生AI試験、PDF案内検出からのフォールバック、AIT/BMP/テキスト。CI 45928516134で初回合成描画成功。lockを取り込み、PSB/JTD複数ページ試験を追加。最新CIと実ファイル・公開監査は未完。
