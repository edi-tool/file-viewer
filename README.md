# file-viewer（ファイル閲覧さん・仮称）

出版・編集実務で受け取った PSD、AI、一太郎、EPS などを専用アプリなしで確認する統合ビュワーの開発プロジェクト。

**開発中：基本描画アダプターのブラウザ統合試験に成功。公開版ではありません。**

- 開発課題: [Issue #1](https://github.com/edi-tool/file-viewer/issues/1)
- 元の課題: [edi-tool.github.io#12](https://github.com/edi-tool/edi-tool.github.io/issues/12)
- [実装計画・受入条件](docs/IMPLEMENTATION.md)
- [先行技術の調査・採用判定](docs/RESEARCH.md)
- [進捗](progress.md)
- [対応形式の拡張](docs/FORMAT-EXPANSION.md)
- [MVP実装・制約](docs/MVP.md)
- [合成試料・安全性検証](docs/VALIDATION.md)

公開予定: https://edi-tool.github.io/file-viewer/ （未公開）。

## データの扱い

実行時はブラウザ内処理のみ、外部へのファイル送信・CDN・API・解析タグなし。依存物は固定版を同梱し、ライセンスを記載する。原本は書き換えない。印刷色・校了品質の保証はしない。

## 開発

Node.js 22以上。基礎テストは外部依存なし。描画ライブラリはビルド時に同一オリジン資産として生成する。

```sh
npm test
npm ci --ignore-scripts
npm run vendor
# 原生Illustrator試験（追加依存の固定監査前）
npm run vendor:ai
# 一太郎の試験用WASM（Rustとネット接続が必要）
bash scripts/build-jtd.sh
npm run preview
python3 -m http.server 8000 -d dist-preview --bind 127.0.0.1
```

関連ツール: [edi-tool](https://edi-tool.github.io/) / [立体書影さん](https://github.com/edi-tool/book_mockup)。
ソースコードは [Apache License 2.0](LICENSE)、独自のマニュアル・解説記事は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)、名称・ロゴは All Rights Reserved とします。第三者ライブラリは各ライセンスに従います。開発元は [NOTICE](NOTICE) を参照してください。
