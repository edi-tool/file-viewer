# 実装計画 — Issue #1

元の課題: https://github.com/edi-tool/edi-tool.github.io/issues/12
採用候補と導入手順は [RESEARCH.md](RESEARCH.md)。

## 目的
出版・編集実務の専用ソフト依存を減らす閲覧専用ツール。PSD・PDF互換AI・JTD・EPSを主対象、PDF/TIFF/PNG/JPEG/GIF/WebPを追加。PSBは容量試験後、INDD/IDML/XDW/Officeは後段。非PDF AIは実験扱い。

## 設計
index.html / styles.css / src/app.mjs / src/probe.mjs / src/renderers/{pdf,psd,jtd,eps,tiff,image}.mjs / src/workers/ / vendor/ / tests/。
各アダプター: open(file,{signal,limits}) -> {kind,mode,pageCount,metadata,warnings,renderPage(index,{scale,signal}),getText?(index),dispose()}。probeは候補判定のみ。レンダラーが形式と描画可否を確定する。例外を握り潰さない。ファイル切替時は旧ジョブIDを無効化しWorker terminate、ImageBitmap.close、ObjectURL revoke、PDF destroy、WASM freeを行う。
UI: ファイル選択/ドロップ、複数ファイル一覧、1件ずつ描画、拡大縮小/ページ移動、容量/寸法/ページ数/警告。表示方式は saved-composite / pdf-compatible / reconstructed / embedded-preview / text-only / metadata-only を区別。原本との差・印刷色は保証しない。キーボード・44pxタップ領域・日本語・共通デザイン。

## 安全性
初期暫定上限: PC100MiB/モバイル30MiB、デコード前24MP/8MP、表示16MP/8MP、1辺4096、Worker15秒。実測で改定。ファイル容量だけでなく展開量・画像寸法・ページ数・WASMメモリを制限。画像デコード前のヘッダー検査を追加すること。TIFF IFD/strip、JTD圧縮展開、PS命令実行を制限。PDF.js isEvalSupported:false、スクリプト/外部リンク無効。SVG/HTMLを直接DOMへ挿入しない。CSPと通信テスト、同一オリジン資産のみ。サービスワーカーは初期不要。実ファイルは許諾済みのみ、未刊行原稿を公開しない。

## 開発順序
- P0: designレンダラーと個別構成を比較し、ライセンス、配信量、精度、性能を記録。採用を決定。
- P1: 共通UI、PDF/AI、PSD、基本画像、TIFF。形式判定コードを再利用。
- P2: JTDレイアウト/テキスト、圧縮形式。
- P3: EPS/PS、非PDF AI実験とプレビューフォールバック。
- P4: 安全性・アクセシビリティ・端末検証・公開。
- P5: IDML/INDD/DocuWorks等を別Issueで検討。

## 受入条件
- ファイル送信なし、操作可能、未知・破損・偽装・巨大ファイルは明確なエラー。連続切替/キャンセルでリークしない。
- AI: PDF互換/非互換案内だけ/旧PS。非互換案内を作品描画成功にしない。
- PSD: RGB/CMYK/16bit/合成なし/PSB。サムネイルは低精度と明示。
- JTD: 縦書き/ルビ/表/画像/段組/複数ページ/圧縮/破損。公式アプリ等と比較。
- EPS: ベクター/埋込TIFF/プレビューなし/日本語フォント/不正区間/無限ループ。実際の描画方式を表示。
- PDF: パスワード/破損/回転/複数ページ。
- Windows Chrome/Edge、Firefox、iPhone Safari実機。ネットワーク検査とメモリ解放。
- 依存固定、ライセンス・ハッシュ・出典、README/CHANGELOG/AGENTS/progress、共通CI/静的チェック、SEO/OGP。
- 公開受入後にハブindex/sitemap/README/404/OGPと組織profile READMEを更新。Issue #1と元Issueは完了まで閉じない。

## セッション実装の補足
`src/session.mjs` の `createSessionManager()` を利用する。アダプターの `dispose()` は同期・例外を出さず、Worker停止等を行うこと。`renderPage()` は `dispose()` 付きフレームを返し、採用されたフレームの解放はUIが責任を持つ。古いフレームは管理側が解放する。AbortSignal自体は同期WASMを停止できないため、親側のタイマー・Worker terminateを各エンジン側に実装する。上限チェックと通信検証は別途必須。試料生成・参照描画・安全性は [VALIDATION.md](VALIDATION.md)。
