# Staging設定・レスポンシブQA記録

記録日：2026-10-31（Asia/Tokyo） / STEP 09-C2-B⑦

## 対象と検証日時

- 検証日：2026-10-31（Asia/Tokyo）。開始・終了時刻は元の結果JSONに記録されていないため、時刻は確定しない。
- 検証対象ソース：`formal-production` / `412f793f3ffc6dd9e582ea4dcdf1e07b4e4e7efb`。
- 検証設定：[wrangler.staging.jsonc](../../wrangler.staging.jsonc)。Worker名は `bashiiin-coffee-staging`、`workers_dev: true`、`preview_urls: false`。
- Staging URL：`https://bashiiin-coffee-staging.misemiruweb.workers.dev`。
- 記録時点の稼働バージョン：`8643b525-9448-4e43-9e7e-f2d990b30b7d`（STEP 09-C2-B⑤の確認記録）。今回のGit保存工程ではCloudflareへ再照会・再デプロイしていない。

## 1. ローカル自動検証

STEP 09-C2-B⑥で実施。Cloudflare実環境への自動テストではない。

| 項目 | 環境・条件 |
|---|---|
| ブラウザー自動化 | 既存Playwright 1.62.1。新規パッケージ導入なし |
| ブラウザー | インストール済みGoogle Chrome 156.0.8078.76、headless |
| ローカル配信 | Wrangler 4.154.0、`node scripts/dev-local.mjs`による`--local`配信 |
| 接続先 | `http://127.0.0.1:8787`のみ。Cloudflare Accessへの接続・認証回避なし |
| 画面 | 幅375 / 390 / 768 / 1024 / 1440 CSS px、DPR 1 |
| 画面高 | 375・390px幅は844px、その他は900px |
| 対象 | TOP `/`、ABOUT `/about/`、COFFEE `/coffee/`、CONTACT `/contact/`、ACCESS `/access/` |

### 25パターンの結果

全セルの「OK」は、HTTP 200、ページ横はみ出しなし、画像読み込みエラーなし、JavaScript実行時・consoleエラーなし、noindex維持を自動確認した結果。見出し・写真の交差と主要文字・フォームの画面外突出も検出されなかった。

| 画面幅 | TOP | ABOUT | COFFEE | CONTACT | ACCESS |
|---|---|---|---|---|---|
| 375px | OK | OK | OK | OK | OK |
| 390px | OK | OK | OK | OK | OK |
| 768px | OK | OK | OK | OK | OK |
| 1024px | OK | OK | OK | OK | OK |
| 1440px | OK | OK | OK | OK | OK |

- document/bodyの横幅を画面幅と比較し、25パターンで意図しない横スクロールなし。TOPの写真トラック内部の横スクロールはページ横はみ出しと区別した。
- 375 / 390 / 768 / 1024pxは各ページでモバイルメニューを開き、5リンク表示・展開状態・Escで閉じる動作を確認。1440pxはデスクトップナビ5リンクを確認した。
- CONTACTは全5幅で送信ボタンdisabled、`data-endpoint-ready="false"`、Site Key空を確認。フォーム幅は下表のとおりで、最大680pxを維持した。入力や送信は行っていない。
- 全ページでrobotsが `noindex, nofollow, noarchive` のままであることを確認した。
- 通常操作で画像・CSS・JavaScriptの取得失敗はなく、外部URLへのアクセスも発生しなかった。

| 画面幅 | CONTACTフォーム実測幅 |
|---|---|
| 375px | 327px |
| 390px | 342px |
| 768px | 680px |
| 1024px | 680px |
| 1440px | 680px |

### スクリーンショット目視

- 全ページ画像25枚と、TOPのモバイルメニュー画像4枚を一時ディレクトリに保存した。
- 幅別の全ページ一覧でヘッダー・見出し・写真・本文・フッターの配置を目視確認し、明確な重なり・欠けを認めなかった。
- ABOUT 1440px、CONTACT 375px、メニュー375 / 1024pxは個別画像も拡大確認した。
- 撮影時は画像読み込みを待機し、TOPの写真トラックをPAUSE操作で停止した。検証用DOMで遅延画像の先読みを行ったが、ソースは変更していない。スクリーンショットは通常の自動移動中の全フレームを保証しない。
- ブラウザーとローカルサーバーは検証終了後に停止した。

**検出不具合：0件（今回の検査・目視の範囲）。修正は行っていない。**

### 元の結果ファイル

記録作成前に `/tmp/bashiiin-responsive-qa-2026-10-31-7UkNwo/results.json` の存在を確認し、25組の網羅・検出結果・エラー0件・CONTACT実測値を読み取った。個人情報・認証情報・フォーム入力値をこの記録へ転記していない。

- 結果JSONのSHA-256：`4b017d29ccf6912335cd0b6c547f8b3b8ae20efd5aebabde10ad36f4b864702a`
- 一時JSON・検証スクリプト・スクリーンショットはGit保存対象外。一時ファイルは将来消える可能性があり、この文書に要約結果を保存する。

## 2. Cloudflare実環境の確認との区別

### これまでのユーザー申告による手動確認

- 390px：全5ページで横はみ出しなし。
- 375px：TOPを確認済み。
- 768px：TOP・CONTACTを確認済み。
- 1024px：TOPを確認済み。
- 1440px：TOP・COFFEE・CONTACT・ACCESSを確認済み。
- ABOUT：1441pxで確認済み。1440pxの実環境確認と同一扱いにはしない。

申告された確認範囲を記録したものであり、全項目の実環境受入完了を意味しない。上記以外の実環境の組み合わせをローカル25パターンの結果で補完済みとは扱わない。

### STEP 09-C2-B⑤のデプロイ・アクセス確認記録

- 指定Workerへの39静的ファイルとWorkerコードの配置に成功し、上記バージョンの100%稼働を確認した。
- 旧Hello Worldバージョン `ef94ab24-7767-4979-89fc-ddd6a0aa1a58` は履歴に残ることを確認した。
- Cookie・認証情報なしのトップ、CSS、写真へのGETはAccessログインへの302転送となり、サイト本体は取得されなかった。
- AccessのAll trafficはユーザー確認済み。今回のQA／Git保存工程ではAccess設定を変更していない。
- CONTACT API・メールのフラグは文字列 `"false"`。実Siteverify・実メール送信は未実施。

## 3. 未検証・次工程

- iOS Safari、Android実機、ソフトウェアキーボード表示時のレイアウト・スクロール。
- 異なるDPR・OSフォント・ブラウザーでの描画差。今回のviewport検証は実機検証の代替ではない。
- Cloudflareで認証した後の全25パターン・全確認項目の網羅的な再検証。
- フォーム実送信、実Turnstile、メール受付・到達、GA4受信。CONTACTを有効化して検証していない。
- 長時間の写真トラック動作・全ループ境界・全キーボード操作・支援技術・性能の最終受入検証。

全ページnoindexとCONTACT無効状態を維持する。ローカルQA成功やStaging配置成功を正式公開承認と扱わない。
