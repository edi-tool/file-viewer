# 技術調査（2026-11-27）

## 結論
最初に flyfish-dev/file-viewer の design レンダラーと個別エンジン構成を同じ素材で比較する。個別構成は保守的な基準案。JTD は独立 WASM エンジンを採用有力とする。採用は実描画・安全性・配布ライセンスの確認後に確定。下記の記載は上流資料の確認結果であり、このrepoの実装実績ではない。

|候補|用途|確認事項・制限|
|---|---|---|
|[ag-psd](https://github.com/Agamnentzar/ag-psd)|PSD/PSB|master package.json 34.2.3、MIT、base64-js 1.5.1 / pako 2.1.0。公開版確認要。保存済み合成画像を使う。CMYK近似、ICC非反映、LAB/Duotone/Multichannel非対応。レイヤー再合成はしない。|
|[PDF.js](https://github.com/mozilla/pdf.js)|PDF/AI|Apache-2.0。既存 [book_mockup](https://github.com/edi-tool/book_mockup) の管理方式を流用。非PDF互換AIでも案内PDFのみ存在する場合がある。テキスト検査と明示的な表示区分が必要。|
|[EZPZ File JTD](https://github.com/ezpzfile/ezpzfile-jtd)|JTD/JTDC/JTTC|LICENSEを直接確認: MIT。README v0.5.14開発者向けプレビュー。WASMと閲覧専用HTMLあり。旧JAW/JBW対象外。縦書き、ルビ、罫線、段組、画像、図形の精度を比較。|
|[pscat](https://github.com/PSCatLabs/pscat)|EPS/PS|Rust/WASM、READMEでは npm版0.6.2以降。コードMIT OR Apache-2.0、フォントの別ライセンスを要監査。実PS互換性、安全な実行制限を確認。|
|[file-viewer](https://github.com/flyfish-dev/file-viewer/blob/main/docs/guide/formats.md)|Adobe系一括|renderer-designは明示的opt-in。ローカルWorker/WASM、保存PSD合成、PDF互換AI、native PGFの限定描画、IDML、INDD埋込プレビュー、実験的PS。未対応AIオペレーター等は診断に残る。複雑な文字・画像・効果・オーバープリント・色管理は完全再現ではない。全依存のライセンス確認が必須。|
|[UTIF.js](https://github.com/photopea/UTIF.js)|TIFF/EPSプレビュー|MIT候補、IFD/展開サイズ制限を確認。|
|[Ghostscript](https://ghostscript.com/about/)|EPS参照描画|AGPL/商用。配布判断前は同梱せず、ローカルの比較基準候補。|
|[Photopea](https://github.com/photopea/photopea)|UI参考|実装全体のソースが公開されていないため移植前提にしない。|

## JTD の導入手順
上流 [web/build.sh](https://github.com/ezpzfile/ezpzfile-jtd/blob/main/web/build.sh) と [WASM API](https://github.com/ezpzfile/ezpzfile-jtd/tree/main/engine/crates/ezpzjtd-wasm) を取得確認。
- 取得時点のbuild.shは wasm32-unknown-unknown と wasm-bindgen-cli 0.2.129を指定。選定タグ・Cargo.lockに合わせる。生成される web/pkg/ の JS と WASM、ライセンス、ハッシュを保存。
- JtdDocument(bytes)、withLimits(bytes, JSON)、text()、html()、summaryJson()、warningsJson()、sheetCount()、fileKind(bytes) を検証する。
- レイアウト表示は JtdEditor.open/openWith、pageCount、pageJson、picturesJson、pictureData と既存web/editor/app.jsの描画処理を再利用。編集・保存APIは呼ばない。free()を確認。
- HTMLは直接innerHTMLに入れず、隔離・サニタイズする。テキストはtextContent。
- 上流ライセンス原文を配布時に含め、フォント・Rust依存も監査。

## EPS の導入手順
DOS EPSの区間を src/probe.mjs の epsSections で検証し、TIFFを抽出する。PS描画は pscat と renderer-design を比較。SVG出力のDOMへの直接挿入は禁止。無限ループ、巨大画像、ファイルアクセス命令、外部通信、フォント欠落を確認。PS描画が未達なら「埋め込みプレビュー」限定で公開する。WMF/EPSIは別途検証。

## 比較ゲート
同じ合成・公開許諾済み試料で、デコード成功/失敗、表示方法、参照画像差分、初期/遅延配信バイト、処理時間、ピークメモリ、キャンセル、通信ゼロ、対応ブラウザ、依存ライセンス・固定バージョンを記録。ライブラリのREADME上の対応表だけを成功実績にしない。
