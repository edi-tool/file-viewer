# 対応形式の拡張
## 今回の試験実装
- Illustrator PGF: MITの [illustrator-pgf 0.1.0](https://github.com/flyfish-dev/illustrator-pgf) を独立Workerで使用。PDF互換優先、案内ページ検出時のみ自動PGFへ、明示的な原生選択も可。旧PS形式AI/AITはPGFへ。npm lockはCI 45928516134で取得したintegrityを根拠に固定。公開版の採用前に全通知、真正ファイルと診断を確認。Zstandardはfzstd 0.1.1を独立Workerへ追加し、単一フレーム・辞書なし・最大32MiBウィンドウ/展開量に制限する。複数フレームや辞書は未対応、チェックサムの完全検証は未実施。上流開発版は複雑な文字・効果・外部画像等を完全再現しない。
- BMP: 非圧縮24/32bitの寸法・領域検査後、ブラウザ画像APIで表示。
- TXT/CSV/TSV/MD/LOG: 2MiB上限、UTF-8優先/Shift_JIS、textContent。MarkdownやCSVの実行・HTML表示はしない。
- AIT: AIと同じルート。PSBは既存の判定・描画接続があるが真正ファイル試験は未完。
- SVG: 5MiB上限。直接DOMへ挿入せず、XMLとして事前検査してからBlob URLの画像コンテキストでCanvasへ描画する。DOCTYPE、script、foreignObject、イベント属性、SMILアニメーション、外部href、CSSの外部url()/@import/@keyframesを拒否する。SVG 2のsecure image processing mode（画像利用時はscript実行・外部参照が無効）に加え、アプリ側でも拒否する二重防御。参照: [SVG 2 Conformance Criteria](https://www.w3.org/TR/SVG/latest/conform.html), [MDN: SVG as an image](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image)。
## 次の候補
- IDML/ICML/INX: @file-viewer/renderer-design のページ表示を比較。INDD/INDT・XDは埋込プレビューと明示。MPL/WASM/フォント等の追加依存監査が必要。
- XDW/XBD（DocuWorks）: 仕様・再配布可能なブラウザライブラリの調査を先行。未対応。
- Office/EPUB: 別途レンダラーを検討。書式再現・ZIP展開上限が必要。
- TIFF: タイル、JPEG圧縮、16bit、ICC。EPS: 複雑なフォント、クリッピング、実ファイル照合。
合成試験で成功しても真正業務ファイルの完全再現ではない。公開は既存の受入条件完了後。

## 主要形式の追加検証
JTDは上流Editorで2ページの日本語文書を合成し、前後操作・本文・各ページの描画を検査。PSBはPhotoshop Large Documentの64bitレイヤーマスク区間を持つ合成RGBデータで合成画像の描画を検査。実際に大容量のPSBを開けるという意味ではない（現行容量/画素制限は維持）。

CI 45928516134: legacy.ai（合成PS）、private.ai（合成PDFコンテナ/Deflate独自データ、案内PDFを検出）、AIT・BMP・テキストのブラウザ試験成功。npm lockを本体に統合し、通常vendorビルドに追加。最終コミットの再試験は別途確認する。

Zstdの依存integrityはflyfish-dev/file-viewerのpnpm-lock.yaml（fzstd 0.1.1）と照合。合成AI24形式で描画を検査する。追加CI結果待ち。
