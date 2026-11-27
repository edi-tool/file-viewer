# file-viewer

実装前に docs/IMPLEMENTATION.md、docs/RESEARCH.md、progress.md を読む。
- [開発原則](https://github.com/edi-tool/.github/blob/main/PRINCIPLES.md) と [共通デザイン](https://github.com/edi-tool/.github/blob/main/DESIGN.md) を遵守。
- GitHub Pages / Vanilla JS ES Modules を優先。必要な描画エンジンのみ遅延読み込み、固定版を同梱。ビルド導入時は理由を記録。
- 外部送信、CDN、実行時API、解析タグ、利用者ファイルの永続化禁止。原稿・実ファイル名・パス・個人情報は公開repoやログに入れない。
- 既存技術を優先し、独自の複雑なバイナリ解析・レイアウトエンジンを新規実装しない。
- 形式判定は候補であり、レンダラーの成功と区別。表示方式・再現限界・エラーを明示。
- WASM/重いデコードは Worker と制限・キャンセルを備える。原本への書き戻しは禁止。
- Node22 node:test、合成素材、iPhone Safari・Windows Chrome/Edge・Firefoxを検証。描画検証後に採用確定。
- 共通テンプレートのCI・静的チェックはUI導入時に同期。README、CHANGELOG、progressを更新。
- 作業ブランチ・PR、検証をまとめてからpush。公開受入完了まで Issue #1 を閉じない。
