# 2026-11-13 店舗デザイン修正・ローカルQA報告

## 1. 総合判定

**B：修正完了・一部未確認。** 指定文章・見出し・写真・共通フッター・フォントを反映し、ローカルChromeの全5ページ×6幅、既存自動テストとHTTP検証が通過した。実機Safari／Android、外部サービスの表示内容、Cloudflare確認サイトへの反映後のQAは未実施。

2026-11-13の明示指示を、v1.6定義書および過去の本文追加・明朝見出し指定より優先した。IMG_5818等の赤マーカー画像そのものは今回の作業環境では確認しておらず、依頼文の削除・維持指定を実装根拠とした。

## 2. Git状態・作業前確認

- branch：`formal-production`。
- 作業前HEAD：`95468695bf0014ae9a8f5b3e2805d8316483ceee`。
- 作業後HEAD：`95468695bf0014ae9a8f5b3e2805d8316483ceee`（変更なし）。
- 開始時から `index.html` / `coffee/index.html` / `contact/index.html` / `styles.css` に未コミット変更が存在。準備中表記・CONTACT説明文・ステータス空欄時の非表示・TOP CONTACT説明省略の既存変更を保持した。TOPのCONTACT専用グリッド指定は、全項目の説明削除に合わせた共通1行指定に統合した。
- 受領素材 `images/DSC_0030.jpeg`、既存の未追跡原本・旧画像・QA資料も保持。stash・破棄・一括追加は実施していない。
- 今回変更した既存ファイル：`index.html` / `about/index.html` / `coffee/index.html` / `contact/index.html` / `access/index.html` / `styles.css` / `script.js` / `scripts/public-files.json` / `docs/asset-map.md` / `README.md`。
- 今回追加したファイル：本報告、`store-revisions-2026-11-13/` のPNG 10件・結果JSON 2件、原本保管コピー `images/formal ver/DSC_0030.jpeg`、`images/web/space/DSC_0030-400.webp` / `DSC_0030-800.webp` / `DSC_0030-1450.webp`。
- 全変更は未コミット・未ステージ。commit / push / merge / deployは実施していない。mainは変更していない。
- 既存構成は指定どおりの5 HTMLと共通 `styles.css` / `script.js`。静的HTML/CSS/JS、Node.js v22.17.0、既存lockfile・Wrangler・parse5を使用。依存・フレームワークの追加なし。

## 3. 修正内容（変更前 → 変更後）

| 対象 | 変更内容 | 維持した内容 |
|---|---|---|
| TOP | 店舗紹介と「コーヒーを見る」、LATEST INFO一式 → ブロックごと削除。COFFEE／ABOUT／ACCESSの説明 → 削除。PCのページ案内 → 各項目1行・高さ80pxに整理 | 写真トラック、H1、Pause/Play、4項目の英字ラベル・リンクタイトル・矢印・遷移先、メインナビ |
| ABOUT冒頭 | H1下の紹介文 → 削除 | H1、SPACE／SWEETS／CULTUREのページ内リンク |
| SPACE | 「木のカウンターと、店内。」→「店内について」。ACCESS案内文 →「自家焙煎したスペシャルティコーヒーを常時5種類取り揃えております。」。店内全景 → 指定写真① | section ID `space`、H2 ID `space-title`、カウンター・椅子・テーブルについての既存説明文 |
| SPACE写真説明 | 旧写真に対応する「木のカウンター、テーブルとコーヒー器具。」→「木のカウンターでコーヒーを準備する手元と抽出器具。」 | 写真下の説明構造。新写真との不一致だけを修正 |
| SWEETS | プリンの説明と提供状況の2段落 → 削除 | 英字ラベル、写真、「コーヒーに、甘いひとときを。」、Instagramリンク |
| CULTURE | 「コーヒーの、その先へ。」→「Bashiiin!coffee グッズ」。Tシャツの説明と関連ページ説明文 → 削除 | 英字ラベル、Tシャツ写真、「アイテムの情報は公式Instagramへ。」、Instagramリンク、末尾の関連ページリンク |
| COFFEE | フッター住所削除・共通フォント適用 | 本文・写真・ページ内案内・豆の最新情報・関連リンクを作業開始時と同じHTMLで保持 |
| CONTACT | フッター住所削除・共通フォント適用 | 本文・3項目フォーム・送信無効・既存の入力検証／ステータス処理を保持 |
| ACCESS | 冒頭説明、「ご来店前に」、指定2段落 → 削除。Instagramリンク上の孤立した区切り線 → 削除 | H1、店舗所在地と地図、住所2行、Google Maps、Instagram、入口看板、関連リンク |
| 共通フッター | 住所2行 → 全5ページで削除 | ロゴ、5ページナビ、Instagram、Copyright |
| 共通実装 | 削除されたTOP専用CSS・空グリッド領域・JSの旧LATEST INFO revealセレクタ → 除去 | ナビ、ギャラリー、フォーム、計測イベントの実装 |

店舗指定の自家焙煎・5種類の記述を、COFFEEの商品情報やJSON-LD等へ自動追加していない。

## 4. 写真

- 指定受領素材：`images/DSC_0030.jpeg`、JPEG 1450×960px。白いシャツの人物・木のカウンター・手元・ドリッパー・ガラスサーバーを目視照合。
- 管理用原本：`images/formal ver/DSC_0030.jpeg`。元の受領ファイルを保持してバイト同一コピーを追加。双方のSHA-256：`f254b238e0be41618d00e9082101f81c183bc2a1b5170f0932ac14d8fa279114`。
- 配信用：`images/web/space/DSC_0030-{400,800,1450}.webp`。それぞれ400×265／800×530／1450×960px、17,692／59,968／238,360 bytes。Chrome Canvas、WebP品質0.84。原本拡大・AI加工・トリミング・色調補正なし。
- alt：`白いシャツの人物が木のカウンターでコーヒーを準備する手元と、ドリッパーやガラスサーバー`。
- HTML：width 1450／height 960、srcsetと既存sizes、eager・fetchpriority high・decoding async。CSSは指定写真だけ高さ上限を解除し、全6幅で1450:960の比率を保持。手元と器具が欠けない構図にした。
- 旧SPACE原本・派生3サイズは削除せず、配信許可リストから旧3サイズのみ除外。新3サイズに置換し、配信は従来どおり40ファイル（開始時の実ファイル数）に限定。管理原本・未使用素材・QA資料はdistへ含めない。
- **写真重複あり**：指定写真は、COFFEEメインの `images/web/coffee/coffee-preparation-{400,800,1206}.webp`（原本 `836650886_1839293087060384_1504843703391329726_n.webp`）と同一カットの別解像度。ABOUT / SPACEとCOFFEEメインで同一カットが重複する。指定されたABOUT差し替えを実施し、対象外のCOFFEE写真は維持した。全体は10配置・実質9カット。TOP内のアクセシブルなループ複製とは別の重複として記録する。
- 画像差し替えの保留なし。2026-11-13の制作使用指示と、全ページの最終公開承認は区別する。

## 5. フォント

| 項目 | 変更前 | 変更後 |
|---|---|---|
| 見出しfamily | `"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif` | `var(--font-body)` |
| 本文family | `"Hiragino Kaku Gothic ProN", "Yu Gothic", "YuGothic", system-ui, sans-serif` | `"Hiragino Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", "YuGothic", system-ui, sans-serif` |
| H1 size（Mobile / Tablet / Desktop） | 40 / 48 / 64px | 34 / 44 / 56px |
| H2 size（同上） | 28 / 32 / 36px | 26 / 30 / 34px |
| H1 / H2 weight | 500 | 500（維持） |
| H1 line-height / letter-spacing | 1.25 / .02em | 1.4 / .01em |
| H2 line-height / letter-spacing | 1.25 / .04em | 1.5 / .02em |
| 本文内H3 | 20px / 600 / 1.5 | サイズ・weight・行高を維持、共通ゴシックfamily適用 |
| 本文 | 16px / 400 / 1.85 / .04em | 維持 |

明朝の格式を弱め、標準的なゴシックで自然な親しみやすさを出した。見出しを一律に太字へせず、H1／H2／H3の階層と本文の読みやすさを維持。外部フォント・フォントファイル・ロゴ画像の変更なし。英字ナビは既存のサンセリフ指定・サイズを維持。

## 6. QA

### コマンド・静的検証

| 検証 | 結果 |
|---|---|
| `npm run build` | PASS：40許可ファイル。原本対応・WebP形式・ハッシュ・リンクとfragment・noindex・CONTACT無効条件も通過 |
| `npm run verify:dist` | PASS：40ファイルの一覧・内容がソースと一致 |
| `npm test` | **355 / 355 PASS**、失敗・skipなし。既存のビルド／SEO／CONTACT／Turnstile等のローカル・モック試験 |
| `npm run verify:local` | **73 / 73 PASS**。40配信ファイルの内容・MIME、内部ページ200、private path 404、API無効503等 |
| `git diff --check` | PASS |
| 作業前との保護比較 | 5ページのhead全体・H1・共通ヘッダーは完全一致。COFFEE／CONTACTのmainも完全一致。Wrangler設定・404.htmlはバイト同一 |
| 外部リンク | 維持した公式Instagram・Google Maps URLへの読み取り専用HTTP確認は両方200。プロフィール内容・地図の店舗ピンの正確性は未確認 |

既存package.jsonにlint／typecheck用scriptはないため創作していない。実サービスを使うTurnstile browser scriptや本番SEOビルドは実行していない。

### ブラウザー確認

追加依存なしのローカルChrome（CDP）で、Wranglerの `http://127.0.0.1:8787` を検証。高さ900px、deviceScaleFactor 1のレスポンシブ幅検証であり、実機エミュレーターではない。

| 幅 | TOP | ABOUT | COFFEE | CONTACT | ACCESS | 観測CLS最大値 |
|---|---|---|---|---|---|---|
| 360px | PASS | PASS | PASS | PASS | PASS | 0 |
| 390px | PASS | PASS | PASS | PASS | PASS | 0 |
| 430px | PASS | PASS | PASS | PASS | PASS | 0 |
| 768px | PASS | PASS | PASS | PASS | PASS | 0 |
| 1024px | PASS | PASS | PASS | PASS | PASS | 0 |
| 1440px | PASS | PASS | PASS | PASS | PASS | 0 |

- 各画面の削除対象不在・維持文言・H1一つ・noindex・フッター5リンク・新フォント・画像読込・文字範囲・ページ全体の横スクロールなし・空コンテナなしを検査。
- Mobileナビ：1100px未満の全25画面で開閉、背景inert、Esc、focus復帰を確認。JavaScript無効時の通常リンクもABOUT / 390pxで確認。
- TOP：全6幅でアニメーション時間の進行、Pause→Play→Pause操作、ループ複製のaria-hidden／inert／空altを確認。390pxのreduced-motionでは自動再生なし・ボタン非表示・手動横スクロール可能。
- CONTACT：全6幅で3項目・送信disabled・endpoint-ready false・Site Key空・Turnstile外部script読込なし・スクリプトsubmit時のgenerate_leadなしを確認。入力検証と無効APIは既存試験・HTTP試験でも確認。
- 30画面でコンソールエラー・未処理例外・404応答・未キャンセルの失敗リクエストを検出せず。CLSは今回のローカル観測値で、実配信の性能保証ではない。
- 390pxと1440pxの全5ページのフルページPNGを取得して目視確認。余白・罫線・日英見出し・自然な改行・写真構図を確認。TOPのPNGは安定した比較用に再生停止状態、CONTACTのPNGは入力検証前の通常初期状態。
- 途中で1024pxのSPACE写真に共通max-heightが残ることを検出。指定写真のCSS優先順位を修正し、全30画面を再実行して比率保持を確認済み。

スクリーンショット・結果の保存先：`docs/qa/store-revisions-2026-11-13/`。

| ページ | Mobile 390px | Desktop 1440px |
|---|---|---|
| TOP | [PNG](store-revisions-2026-11-13/top-390.png) | [PNG](store-revisions-2026-11-13/top-1440.png) |
| ABOUT | [PNG](store-revisions-2026-11-13/about-390.png) | [PNG](store-revisions-2026-11-13/about-1440.png) |
| COFFEE | [PNG](store-revisions-2026-11-13/coffee-390.png) | [PNG](store-revisions-2026-11-13/coffee-1440.png) |
| CONTACT | [PNG](store-revisions-2026-11-13/contact-390.png) | [PNG](store-revisions-2026-11-13/contact-1440.png) |
| ACCESS | [PNG](store-revisions-2026-11-13/access-390.png) | [PNG](store-revisions-2026-11-13/access-1440.png) |

機械検証結果：[browser-results.json](store-revisions-2026-11-13/browser-results.json)、[static-results.json](store-revisions-2026-11-13/static-results.json)。

### 未実施・既知事項

- iOS Safari／Android Chrome等の実機、別OSのフォント、支援技術による読み上げ、実際のタッチ操作は未実施。
- 店舗添付の赤マーカー元画像との直接比較は未実施。依頼文の指定に沿って確認した。
- Instagramのプロフィール表示・Google Mapsの店舗ピンの最終確認は未実施。
- Cloudflare確認サイトの更新後の表示、実Siteverify、メール到達、GA4受信、本番SEO・DNSの検証は対象外・未実施。
- 新規の未解決表示不具合は検出していない。ABOUT／COFFEEの同一カット重複は上記の既知事項として残る。

## 7. 変更範囲外・保護した機能

ロゴ・色・背景・対象外写真・ヘッダー・5ページのH1・内部リンク先・既存title／description／OGP／JSON-LDを維持。JSON-LDの住所とACCESS本文住所も維持した。

canonical／og:url／og:image／配信用sitemap.xml／robots.txtは作業開始時に未設定・未生成で、今回追加していない。既存の公開SEO用スクリプト・設定は変更していない。GA4接続も元から未完了で、既存の独自イベント／dataLayer連携を接続済みとは扱わない。

Cloudflare Worker `/api/contact`、Turnstile実装、送信先・送信基盤・DNS・Cloudflare設定・Secretを変更していない。API／メールのフラグは文字列false、フォームはdisabled・endpoint-ready false・Site Key空を維持。指定された宛先 `bashiiin06@gmail.com` を本番設定へ適用したとは扱わない。正式ドメイン `bashiiin-coffee.com` のDNS・公開設定は変更していない。

## 8. 次工程

ローカル修正はレビュー可能で、次の明示依頼があれば、今回の差分と既存差分を分けて個別確認したうえでcommit／push／Cloudflare確認サイト更新の準備へ進める。未追跡原本・旧素材・過去QA資料を一括で追加しない。公開工程の承認を本報告から推測しない。

店舗によるフォント・指定写真・2ページ間の同一カット重複の見た目確認、および必要な実機QAを次工程で行う。今回commit／push／Cloudflareへのdeploy・確認サイト更新・本番公開・フォーム本番送信は実施していない。

## 2026-11-15 GitHub保存前の再現性・資料保存の追補

11月13日の店舗修正・画像・フォント・ブラウザーQA記録は変更していません。配信用画像の固定ハッシュ照合を追加し、通常buildとテストから原本の必須依存を外しました。原本が存在する環境での照合と、全原本を必須とする監査モードは維持しています。

本報告Markdownと上のPNG 10件・JSON 2件は、一式を個別のGit保存候補に選定しました。原本・旧素材・過去の無関係な未追跡QA資料は含めません。Static Assetsへの配信対象にも含めません。

新しいテスト結果は [再現性改善・QA保存報告](build-reproducibility-2026-11-15.md) を参照してください。正確な保存候補とローカル保管対象は [Git保存対象一覧](github-save-plan-2026-11-15.json) に記録します。今回もgit add・commit・push・deployは行っていません。
