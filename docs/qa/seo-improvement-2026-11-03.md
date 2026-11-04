# Bashiiin! coffee SEO改善・本文拡充報告

確認日：2026-11-03 / branch：`formal-production` / 基準commit：`73803d8`

## 1. 総合結果

完了（今回依頼されたローカルSEO実装・全5ページ確認の範囲）。検索公開・本番サービス接続・店舗の最終公開承認は別工程。既存の読み込み時レイアウト移動は下記の性能確認に記録した。

依頼元の `Bashiiin_coffee_SEO_improvement_Codex_instruction_2026-11-03.md` と今回のユーザー指示に従い、文章量を抑える旧方針をSEO改善の範囲で緩和した。5ページ、写真主体の構成、既存写真・機能、noindex、CONTACT無効を維持した。

作業開始時に、5 HTML・CSS・package.jsonに未コミット変更があり、SEO用スクリプト等も未追跡だった。本文・title/description・OGPの大部分は既存の作業変更に含まれていたため、これを保護して、説明の補強・本文レイアウト・ページ内導線・見出しとARIA参照の整合・検証を追加した。既存変更を今回新規作成したものとは扱わない。

## 2. 変更ファイルとページごとの内容

| ファイル | 最終差分の内容（作業開始時の未コミット変更を含む） | 今回の追加調整 |
|---|---|---|
| `index.html` | 固有メタ・OGP、店舗紹介、LATEST INFO、4ページの説明付き案内 | 紹介2段落をひとまとまりにし、PCで細い3列にならないよう調整。営業情報の変更可能性を補足 |
| `about/index.html` | 導入、SPACE / SWEETS / CULTUREの説明、関連ページ案内 | 3セクションへのページ内リンク、CULTURE本文と末尾案内の補強 |
| `coffee/index.html` | 導入、カウンターの説明、スペシャルティコーヒー、CURRENT BEANS、関連ページ案内 | 一般説明の見直し、「豆の紹介を読むときに」を追加、ページ内リンク、自然な見出し改行、セクション名とARIAの対応、ACCESSリンクの共通スタイル |
| `contact/index.html` | 3項目の案内、送信準備中の明示、営業情報とACCESS案内 | 内部リンクの行き先を住所・建物名・地図と具体化。form要素内は変更なし |
| `access/index.html` | 所在地と地図、来店前の営業情報、ABOUT / COFFEE案内 | セクションのARIA参照を直下のH2に対応させた |
| `styles.css` | 既存の見出し・キャプション調整、追加本文のレイアウト | 本文16px・最大38emの行幅、段落間隔、H2/H3の間隔、TOP案内の2行構成、CULTURE長文の縦配置、ページ内リンク44px操作高さ |
| `README.md` | 本文方針、ページの役割、SEO実装済み範囲と保留項目、報告への参照 | 今回更新 |
| `docs/qa/seo-improvement-2026-11-03.md` | 本報告 | 今回追加 |

`package.json` と未追跡の `scripts/production-seo.*` / `scripts/seo-pages.mjs` は作業開始時の内容を維持。公開用SEOビルドや公開切替は実行していない。依存・lockfile・Worker・Wrangler設定・公開許可リスト・script.js・画像は変更していない。

## 3. 実際の可視本文と見出し

### TOP

- H1「スペシャルティコーヒーを、京都で。」を維持。
- 写真直後：京都・河原町のスペシャルティコーヒー店であること、木のカウンターとコーヒー器具、サイトで紹介する内容を2段落で案内。
- H2「LATEST INFO」：営業日・営業時間は公式Instagramで確認し、変更の可能性があるため来店前に見ることを説明。
- H2「Bashiiin! coffeeを知る」：COFFEE / ABOUT / ACCESS / CONTACTの内容を各リンクの説明文で区別。住所・建物名、CONTACT送信準備中も可視表示。

### ABOUT

- H1「Bashiiin! coffeeについて」直後：店内、スイーツ、アイテムを写真で紹介するページと説明。SPACE / SWEETS / CULTUREのページ内リンク。
- H2「木のカウンターと、店内。」：カウンター・テーブル・器具、椅子や室内配置など写真で確認できる範囲を説明し、ACCESSへ案内。
- H2「コーヒーに、甘いひとときを。」：カラメルのかかったプリン・皿・スプーンの実写を説明。掲載写真と現在の提供内容が異なる可能性、最新情報のInstagram確認を明示。
- H2「コーヒーの、その先へ。」：レンガ壁のイラスト入りTシャツを説明し、コーヒーをモチーフにした表現を紹介。現在の販売・在庫・活動歴は断定しない。
- 末尾：COFFEEで読める内容と、ACCESSの住所・地図を案内。

### COFFEE

- H1「スペシャルティコーヒーを、中心に。」直後：ページで分かることを説明し、各H2へのリンクを配置。
- H2「コーヒーのあるカウンター」：ドリッパー・ガラスサーバー・ポット・準備する手元を説明し、ABOUTへ案内。写真から恒常的な抽出方式を断定しない。
- H2「スペシャルティコーヒーについて」：風味・香り・生産地や生産背景など、特徴に価値が見いだされるコーヒーであること、酸味・甘さの印象・口当たり・余韻という楽しみ方を説明。
- H3「豆の紹介を読むときに」：産地と風味の意味を初めて読む人に説明し、好みの一杯を探す手がかりを示す。店舗の銘柄や原産国は追加していない。
- H2「いまの豆」：豆の特徴を知る楽しみ、取扱いや提供状況の変動可能性、公式Instagramでの確認方法を案内。未確認の豆名・産地・更新日を作らない。
- 末尾：営業情報・ACCESS・CONTACTと、送信準備中の状態を案内。

一般的なコーヒーの説明は [SCAの定義](https://sca.coffee/what-is-specialty-coffee) と [Coffee Value Assessment](https://sca.coffee/value-assessment) を参照して確認した。店舗の認証・採点・独自製法を示すものではない。写真は配信中の実画像と画像管理表を照合して確認した。

### ACCESS

- H1「アクセス」直後：京都・河原町、京都府京都市下京区市之町239-1 やながわビル2F、住所・建物名とGoogle Mapsを使う案内。
- H2「店舗所在地と地図」：正式住所と既存地図リンクを維持。
- H2「ご来店前に」：公式Instagramで最新の営業情報を確認すること、ABOUT・COFFEEで読める内容を案内。徒歩分数・駐車場・固定営業時間を追加しない。

### CONTACT

- H1「お問い合わせ」直後：お名前・メールアドレス・お問い合わせ内容の3項目と、現在送信できない状態を明記。
- 来店前の営業情報はInstagram、住所・建物名・地図はACCESSへ案内。
- 既存の「現在、送信機能は準備中です。」、ラベル、利用目的、入力制約、Turnstile属性、エラー領域を維持。フォームだけのページに不要なH2を追加しない。

可視本文の概算文字数（main内の見出し・説明・フォームラベル等を含む。ナビ・sr-only・hidden・template・noscript・空白を除外。文字数合わせの目標値ではない）：

| ページ | 基準commit | 作業開始時の未コミット状態 | 最終 |
|---|---:|---:|---:|
| `/` | 132 | 319 | 332 |
| `/about/` | 161 | 775 | 833 |
| `/coffee/` | 121 | 885 | 1042 |
| `/contact/` | 92 | 284 | 300 |
| `/access/` | 98 | 318 | 318 |

## 4. SEOタグ・構造化データ・検索公開設定

固有title / descriptionと、同内容のog:title / og:descriptionを全5ページで確認済み。title/descriptionは作業開始時点のSEO変更をそのまま活かした。

| ページ | title | description |
|---|---|---|
| `/` | Bashiiin! coffee｜京都・河原町のスペシャルティコーヒー | 京都・河原町にあるスペシャルティコーヒー店、Bashiiin! coffee。コーヒーや店内の様子、スイーツ、店舗所在地をご紹介。営業日・営業時間の最新情報は公式Instagramでご確認ください。 |
| `/about/` | お店について・店内・スイーツ｜Bashiiin! coffee（京都・河原町） | Bashiiin! coffeeの店内や空間、スイーツ、コーヒーをモチーフにしたアイテムをご紹介。京都・河原町のスペシャルティコーヒー店の雰囲気を、写真と文章でご覧いただけます。 |
| `/coffee/` | スペシャルティコーヒー・コーヒー豆｜Bashiiin! coffee（京都・河原町） | 京都・河原町のBashiiin! coffeeのコーヒーページ。スペシャルティコーヒーについて、カウンターの器具や店内写真とともにご紹介します。取り扱い豆の最新情報は公式Instagramをご確認ください。 |
| `/contact/` | お問い合わせ｜Bashiiin! coffee（京都・河原町） | Bashiiin! coffeeへのお問い合わせページ。お名前・メールアドレス・お問い合わせ内容の3項目フォームをご案内しています。現在、送信機能は準備中です。営業情報は公式Instagramをご確認ください。 |
| `/access/` | アクセス・所在地｜Bashiiin! coffee（京都・河原町） | 京都・河原町のスペシャルティコーヒー店Bashiiin! coffeeへのアクセス。住所は京都市下京区市之町239-1 やながわビル2F。Google Mapsの地図リンクと最新営業情報の確認先をご案内します。 |

| 項目 | 状態 | 確認内容・残る工程 |
|---|---|---|
| lang / H1 / H2 / H3 / landmarks | 実装済み | lang=ja、H1・main・footerは各1つ。見出し階層の飛びなし。navの識別名・現在ページ、ARIA参照、ID重複なし |
| 内部リンク | 実装済み | 5ページのヘッダー・モバイル・フッターと本文内導線、ページ内アンカーの行き先を検証 |
| robotsメタ | 実装済み | 5ページとも `noindex, nofollow, noarchive`。検索公開への切替なし |
| canonical / og:url | 本番ドメイン・公開承認確定後 | 現在は未設定。プレビューURLや仮URLを設定していない |
| OGP基本項目 | 実装済み | title / description / type=website / site_name / locale=ja_JP。twitter:card=summary |
| og:image / 画像付き共有表示 | 要確認・本番ドメイン確定後 | 未設定。正式原本由来の写真・比率・絶対URLと掲載承認を確定する |
| favicon | 実装済み | 既存 `favicon-square.png` 64×64の参照・配信を確認。再生成なし |
| TOP店舗JSON-LD | 実装済み | JSON構文正常。CafeOrCoffeeShop、店名、説明、住所、公式Instagramのみ。主たる店舗データはTOPに1件 |
| JSON-LDのURL類 | 本番ドメイン確定後 | @id / url / image / logoは現在未設定。正式URL確定後に追加 |
| 未確認の店舗属性 | 要店舗確認 | 営業時間・価格帯・緯度経度・予約可否・架空レビュー等を含めない。他ページへの店舗JSON-LDの複製なし |
| sitemap.xml | 本番ドメイン・公開承認確定後 | 現在は出力なし。正式5URLで別途整備 |
| robots.txt | 本番ドメイン・公開承認確定後 | 現在は出力なし。noindexメタを維持し、robots.txtのDisallowだけで検索除外したとは扱わない |
| GA4 / Search Console | 今回未実施 | GA4受信・検索順位・検索流入の改善効果は検証していない |

## 5. 検証と既存機能

- `npm run build` / `npm run verify:dist`：通過。許可リストどおり39ファイル。管理文書・Workerソース・原本・未使用素材は配信対象外。
- `npm test`：352件通過、失敗・skipなし。既存のビルド・SEO準備処理・フォーム・Worker等のテスト。実Siteverify・実メールではない。
- `npm run verify:local`：72項目通過。配信内容・MIME、末尾スラッシュ、404、非公開資料の非配信、無効APIの503を確認。空JSONによる無効API応答の検査だけで実メール送信なし。
- parse5による5ページの静的検査：HTML解析エラーなし、固有title/description、メタとOGP一致、H1・見出し順、内部リンク・アンカー、ARIA参照、alt・寸法、JSON-LD、noindexを検査。
- 作業開始時ファイルとの比較：全img属性（src / srcset / sizes / alt / width / height / loading / fetchpriority等）、共通header/footer、CONTACTのform内部、script.jsは一致。写真の追加・重複・生成なし。TOPの先頭写真だけ優先取得、他は既存の遅延読込を維持。
- 差分に対して `git diff --check` を実行。lint / typecheckのscriptは存在しないため創作していない。

### ブラウザー表示・操作

Chrome headless、viewport高さ900px、全5ページ×6幅＝30ケースを確認し、全ケースのfull-pageスクリーンショットを保存した。

| 幅 | 5ページ・画像・可視本文・横はみ出し | ナビゲーション・操作 |
|---|---|---|
| 360px | 通過 | メニューのEnter / Tab循環 / Shift+Tab / Esc / focus復帰、写真トラック、CONTACT無効を確認 |
| 390px | 通過 | 同上 |
| 430px | 通過 | 同上 |
| 768px | 通過 | 同上 |
| 1024px | 通過 | 同上 |
| 1440px | 通過 | Desktopナビ、写真トラック、CONTACT無効を確認 |

- すべての本文画像が読み込めること、追加本文が非表示にならず16px以上であること、documentの横幅がviewportを超えないことを確認。スクリーンショット用に横トラックの画面外lazy画像もブラウザー内でのみ読み込ませた。配信HTMLのloadingは変更していない。
- 写真トラック：キーボードでPause / Play、実アニメーション、停止後のArrowRight、ループ複製のaria-hidden / inert / 空altを確認。
- ページ内案内：ABOUT / COFFEEの全リンクをクリックし、hashと実際のセクションを確認。
- CONTACT：disabled、endpoint-ready=false、Site Key空、準備中表示を確認。ブラウザー内の架空入力でsubmitイベントを発生させても送信拒否し、POST・外部通信・generate_leadが発生しないことを確認。スクリーンショットは再読込後の初期状態。
- reduced-motion：390pxで自動再生なし、手動横移動可。JavaScript無効時も全5ページで本文・ナビが読め、CONTACTは送信disabled。
- JavaScript例外・400以上の配信応答・外部通信・フォームPOSTは、30ケース全体で0。
- `/about`等の末尾スラッシュ転送に加え、全5ページの`index.html`付きURLがそれぞれ`/`・`/about/`等へ転送されることを確認。
- 390pxと1440pxの全5ページ、および360pxのABOUT / COFFEE、768pxのCOFFEEの画像を目視確認。本文・写真・リンクに重なりや欠落なし。

代表スクリーンショット（ローカル検証出力）：

| ページ | Mobile 390px | Desktop 1440px |
|---|---|---|
| TOP | [画像](/private/tmp/bashiiin-seo-20261103-qa/390-top.png) | [画像](/private/tmp/bashiiin-seo-20261103-qa/1440-top.png) |
| ABOUT | [画像](/private/tmp/bashiiin-seo-20261103-qa/390-about.png) | [画像](/private/tmp/bashiiin-seo-20261103-qa/1440-about.png) |
| COFFEE | [画像](/private/tmp/bashiiin-seo-20261103-qa/390-coffee.png) | [画像](/private/tmp/bashiiin-seo-20261103-qa/1440-coffee.png) |
| CONTACT | [画像](/private/tmp/bashiiin-seo-20261103-qa/390-contact.png) | [画像](/private/tmp/bashiiin-seo-20261103-qa/1440-contact.png) |
| ACCESS | [画像](/private/tmp/bashiiin-seo-20261103-qa/390-access.png) | [画像](/private/tmp/bashiiin-seo-20261103-qa/1440-access.png) |

### 読み込み時のレイアウト移動と性能の限界

**後続調査による訂正（2026-11-03）**：以下は当時の記録です。前回スクリプトの値はlayout-shiftスコアの単純合計で、セッションウィンドウ方式の正式なCLSではありません。また、保存JSONの全ケース最大は0.410021（768px / COFFEE）で、以下の約0.395は全ケースの最大値ではありませんでした。後続工程では時刻付きの正式なCLSを再計測し、原因3件を修正しています。最新の結果・回帰検証は [初期レイアウト移動の調査報告](layout-stability-2026-11-03.md) を参照してください。

PerformanceObserverで初期読み込み時のlayout-shift（直前の入力を伴わないもの）を確認したところ、30ケースで合計値0〜約0.395を検出した。モバイルメニュー初期化前後のヘッダー高さ変更、および写真付近のコンテンツ移動が記録されている。**CLS目標達成済みとはしない。**

作業開始時HTML / CSSと現行版を、390 / 1024 / 1440pxのTOP / ABOUT / COFFEEで別途比較した。1024pxのABOUT / COFFEEでは、開始時・現行とも約0.395を記録した。1440pxのABOUTは開始時約0.071・現行約0.063。初期描画タイミングによって0となるケースもあるため、改善・悪化を単発の値だけで断定しない。比較結果は `cls-comparison.json` に保存した。

既存の初期描画処理・画像領域の確保は今後の性能調整事項として残す。今回、共通ナビやギャラリーの初期化処理の改修は行っていない。画像寸法・srcset・優先読込等の既存設定を維持したことと、実回線の性能目標を達成したことは区別する。

ローカル用QAスクリプト・JSON・画像は `/private/tmp/bashiiin-seo-20261103-qa.mjs`、`/private/tmp/bashiiin-seo-20261103-qa/` に保存する。Gitや配信許可リストには追加しない。ブラウザーからの外部通信・POSTを遮断し、フォーム送信や実Turnstile接続なしで検査する。

本検証はローカルのデスクトップChromeで行う。iOS Safari / Android Chrome実機、PageSpeed Insights / Lighthouse、実回線でのCore Web Vitals、構造化データの外部検証ツール、検索結果・共有カードの実表示は未検証。公開前最終QAの完了とは扱わない。

## 6. 店舗確認・本番後に残る事項

- コーヒーの実際の提供スタイル・抽出方式・豆の選定方針、現在の豆の銘柄・産地・精製方法・風味・確認日。
- スイーツの正式商品名・現在の提供状況、アイテムの販売・在庫、店舗の開業背景や具体的な活動歴。
- 最新の入口案内・最寄駅等の補足、Google Mapsの正確な店舗ピン。既存リンクは店名検索URLのまま維持し、今回ピンの正確性を新たに確認済みとはしていない。
- 全ページの本文・写真掲載許可・最終公開承認。原本との対応が確認できることと公開承認は区別する。
- 正式ドメイン確定後のcanonical・sitemap・robots.txt・OGP画像・JSON-LD絶対URL、環境分離、別承認によるnoindex切替。
- フォームの本番有効化・実認証・実メール到達、GA4接続。今回のSEO本文・ローカル検証から完了と推測しない。

## 7. Git status・公開操作

`formal-production`を維持。ステージング・commit・fetch・pull・push・merge・デプロイ・DNS変更は行っていない。main・既存GitHub Pages workflowにも変更なし。

今回対象の変更は5 HTML・styles.css・README.md・本報告。作業開始前からのpackage.json変更、SEO準備スクリプト4件、写真原本・旧JPEG派生・作業用JSON-LD資料等の未追跡ファイルはそのまま保持し、追加・上書き・削除・Git登録していない。

終了時の追跡ファイル状態：

```text
 M README.md
 M about/index.html
 M access/index.html
 M coffee/index.html
 M contact/index.html
 M index.html
 M package.json
 M styles.css
```

未追跡52件（開始時51件＋本報告1件）。既存の素材・入力資料・SEO準備スクリプトを含む。ステージ済みファイルなし。ローカルサーバーは検証後に停止。
