# MVP実装状況
開発版（noindex、未公開）。ネイティブ画像、PDF.js、ag-psd、UTIFを利用する共通UIとアダプター。PSBは未検証。TIFFは先頭ページ、EPSは埋め込みTIFFのみ。JTDはWASM資産の配置後に本文を表示する試験コード（未導入）。実EPSの再描画、JTDページ描画、非PDF AIは未実装。
`npm install --ignore-scripts && npm run vendor` で同一オリジン用vendorを生成。npm installの固定lockと全推移依存のライセンス・ハッシュ監査、成果物配布方式を確定してから公開する。PDF.js 6.5.438 は既存 book_mockup の使用版。ag-psd 34.2.3 は上流package.json、utif 3.1.0 は上流package.jsonを参照。npm配布版とブラウザ動作はCIで検証する。GitHub Actions Renderer integrationの成功を確認するまで描画対応を確定しない。
安全性: 30MiB/8MP/4096px、Worker 15秒、CSP、外部通信なし。TIFF内部展開・PDF解析のCPU/メモリ上限は追加検証必須。TIFF/PSD workerは文書を返す前に停止。PDF.jsの内部Workerはtask.destroyで破棄。開発段階であり、未信頼ファイルへの公開運用はまだ不可。
