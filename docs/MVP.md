# MVP実装状況
開発版（noindex、未公開）。ネイティブ画像、PDF.js、ag-psd、UTIFを利用する共通UIとアダプター。PSBは未検証。TIFFは先頭ページ、EPSは埋め込みTIFFのみ。JTDはWASM資産の配置後に本文を表示する試験コード（未導入）。実EPSの再描画、JTDページ描画、非PDF AIは未実装。
`npm install --ignore-scripts && npm run vendor` で同一オリジン用vendorを生成。npm installの固定lockと全推移依存のライセンス・ハッシュ監査、成果物配布方式を確定してから公開する。PDF.js 6.5.438 は既存 book_mockup の使用版。ag-psd 34.2.3 は上流package.json、utif 3.1.0 は上流package.jsonを参照。npm配布版とブラウザ動作はCIで検証する。GitHub Actions Renderer integrationの成功を確認するまで描画対応を確定しない。
安全性: 30MiB/8MP/4096px、Worker 15秒、CSP、外部通信なし。TIFF内部展開・PDF解析のCPU/メモリ上限は追加検証必須。TIFF/PSD workerは文書を返す前に停止。PDF.jsの内部Workerはtask.destroyで破棄。開発段階であり、未信頼ファイルへの公開運用はまだ不可。

## EPS・JTDの追加接続（CI検証待ち）
pscat@0.7.1 の core.js と wasm を利用。maxSteps 200万、Worker 15秒。原点0・単ページ・整数BoundingBoxのEPS本体を試験対応。DOS EPSは埋込TIFF優先。フォント通知・配布ライセンスを確認。非ゼロ原点、PS一般、実AIのEPSは未対応。JTDは v0.5.14 を開発時にWASMビルドし、withLimitsで本文のみ表示、合成文書のラウンドトリップ試験をCIで実行する。Rust推移依存のライセンス監査・固定commitの照合は配布前に必要。初期説明の「未実装」はこの追記で更新。

## 安全性の追加
TIFFは初期版では非入れ子・非タイル・非RAW・非JPEG/Deflate・インターリーブ形式に制限し、IFD、タグ件数、オフセット、ストリップ長を事前確認。LZW/PackBitsの実画像検証は別途必要。PDFの読み込み・描画に暫定15秒タイマーを追加。JTD v0.5.14のcommit 454c445a48ec9c3b5b2db4e9e44711d10ff45fcf をビルド前に照合。30MiB等の上限は開発用暫定値。
