# 検証素材と採用ゲート（2026-11-27）

## 生成素材
`node scripts/fixtures.mjs generated-fixtures` で著作権・個人情報の問題がない合成9ファイルを再生成できる。画像は64×64、左半分赤、右半分青。参照点(16,32)/(48,32)のRGBが(255,0,0)/(0,0,255)。合成PSDはレイヤーなし、AIは拡張子を変えたPDF候補であって真正なIllustratorファイルではない。実データの対応証拠として扱わない。

| ファイル | 期待 |
|---|---|
| two-colors.pdf | PDF描画 |
| pdf-compatible-candidate.ai | PDFルート候補 |
| composite.psd | 保存済み合成画像 |
| rgb.tiff | TIFF描画 |
| vector.eps | PS描画、64×64 bbox |
| binary-preview.eps | EPSのPS区間とTIFFプレビュー |
| invalid-preview.eps | 不正区間を拒否 |
| wrong-extension.psd | PDFと判定、拡張子不一致を明示 |
| truncated.psd | 破損として拒否 |

## 今回の参照検証
ローカルの生成素材をPillow（PSD/TIFF/埋込TIFF）、PyMuPDF（PDF/AI候補）、Ghostscript 10.05.1（EPS/抽出PS）で検証。7描画のサイズと2点の色が期待通り。Node 22.16.0。参照描画の再現用 `python scripts/reference-render.py` は開発環境用のみ。GhostscriptやPythonは公開ツールに同梱しない。npmの名前解決が失敗(EAI_AGAIN)したため候補JS/WASMの導入実行は未実施。

## EPS重要追記
[pscat browser guide](https://github.com/PSCatLabs/pscat/blob/main/docs/guides/browser.md) を確認。低レベル web/pscat.js の Pscat.load()、maxSteps、run/begin/step、errorを利用候補とする。npm Rendererには現時点でmaxStepsオプションがないとの記載。無制限の同期renderは公開パスで使わない。固定したタグで上限を確認、専用Worker、親側タイムアウト・terminate、bboxと出力ピクセル・入力バイト上限、フォント欠落警告。PSソースはバイナリ保持のまま扱えるAPIを確認する。SVGは未信頼DOMへ入れない。ソース資料記載のサイズは版により約7.5–11MB、実配布物で測る。ライセンスはコードに加えてOFL-1.1、LPPL-1.3c、第三者通知を監査。

## JTD重要追記
[上流 viewer.html](https://github.com/ezpzfile/ezpzfile-jtd/blob/main/web/viewer.html) は JtdDocument.html() をinnerHTMLへ挿入する。上流HTMLをそのままアプリに取り込まず、安全なテキスト表示・Canvas描画を優先。HTMLは明示的な隔離とサニタイズが必須。真正JTD/JTDCの許諾済み試料を用意し、公式ビューアと縦書き・ルビ・表・画像を照合。拡張子変更したデータでは代用しない。

## 次の実測（未着手）
renderer-design / ag-psd / PDF.js / UTIF.js / pscat / JTD WASM を固定版で取得し、実装候補ごとに生成試料と真正許諾済み試料を比較。真正AI（PDF互換/非互換、案内ページ）、PSD（レイヤー/CMYK/16bit/合成なし）、PSB、JTD、実EPS（フォント・クリップ・画像、非ゼロ/負のBoundingBox）、巨大・破損・無限ループを追加。各試験の記録欄: ライブラリ版/ハッシュ、試料識別子、表示モード、参照差分、警告、初期/遅延配信量、時間、メモリ、ネットワーク、端末、PASS/FAIL/NOT RUN。依存取得とブラウザ実測なしで採用を確定しない。
