# file-viewer（ファイル閲覧さん・仮称）

出版・編集実務で受け取った PSD、AI、一太郎、EPS などを専用アプリなしで確認する統合ビュワーの開発プロジェクト。

**現在は開発準備段階。描画機能はまだ実装していません。**

- 開発課題: [Issue #1](https://github.com/edi-tool/file-viewer/issues/1)
- 元の課題: [edi-tool.github.io#12](https://github.com/edi-tool/edi-tool.github.io/issues/12)
- [実装計画・受入条件](docs/IMPLEMENTATION.md)
- [先行技術の調査・採用判定](docs/RESEARCH.md)
- [進捗](progress.md)

公開予定: https://edi-tool.github.io/file-viewer/ （未公開）。

## データの扱い

実行時はブラウザ内処理のみ、外部へのファイル送信・CDN・API・解析タグなし。依存物は固定版を同梱し、ライセンスを記載する。原本は書き換えない。印刷色・校了品質の保証はしない。

## 開発

Node.js 22 以上。形式判定の合成テストのみ、依存なし。

```sh
npm test
```

関連ツール: [edi-tool](https://edi-tool.github.io/) / [立体書影さん](https://github.com/edi-tool/book_mockup)。
ライセンスは所有者の確定後に明記。第三者ライブラリは各ライセンスに従う。
