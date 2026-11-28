# Changelog

## [Unreleased]
### Added
- 開発仕様、技術調査、形式判定と合成テスト。
- 合成ファイル生成、ローカル参照描画、追加の構造テストと検証計画。
- 共通セッション管理と競合・解放テスト、暫定CI。
- 開発用共通UI、PDF/画像/PSD/TIFF/EPS/JTD本文アダプター、依存固定、ブラウザ統合CI、ローカル配布プレビュー。
- JTDレイアウトの近似描画、TIFFページ切替（開発試験）。
- Illustrator原生PGF試験、AIT、BMP、テキスト・CSV/TSV/MD/LOGの安全なプレーンテキスト表示、PSBとJTD複数ページ試験。
- SVGの隔離静的表示（DOCTYPE/script/foreignObject/アニメーション/外部参照を拒否）。
### Fixed
- 50ファイル上限を超えた追加を黙って切り捨てず通知する。
- 選択中ファイルを閉じた際、次ファイルに保存済みのEPS表示方式を保持する。
