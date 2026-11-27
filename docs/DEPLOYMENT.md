# GitHub Pagesの配布と描画資産
GitHub Pagesのブランチ直接配信では、gitignore対象の vendor/ が存在せず、PDF/AI/EPS/PSD/TIFF/JTD等の描画エンジンを取得できない。ブランチ数は原因ではない。公開設定は管理画面から確認する。
## 配布準備
npm ci --ignore-scripts、npm run vendor、bash scripts/build-jtd.sh、node scripts/preview-build.mjs --full、node scripts/verify-distribution.mjs。配布物は dist-preview/。IDMLなどの未承認試験資産は許可リストに含めない。
## CI
Pages distribution はPRで配布物を生成し、ハッシュ・必須ファイル・第三者通知・実際の /file-viewer/ サブパスでのAI/JTD表示を検査する。ZIP成果物 viewer-distribution を保存する。PRではデプロイしない。
## 公開
ライセンス・安全性・公開受入確認後、Settings > Pages > Build and deployment > Source を GitHub Actions に切替。mainで Actions > Pages distribution > Run workflow を選択し publish=true を明示して実行。公開するかどうかは管理者の判断。CIの成功を確認してから公開版のURLで build-info.json と vendor/illustrator/engine.mjs、worker.mjs を確認し、AIを実際に開く。noindexはこの修正では保持する。
実行時は同一オリジンの描画資産の取得のみ。利用者ファイルを外部に送信しない。GitHub Pages設定変更・本番への配信はこの修正だけでは行われない。
