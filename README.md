# Bashiiin! coffee 正式Webサイト

京都・河原町のスペシャルティコーヒー店、Bashiiin! coffeeの正式Webサイト制作リポジトリです。写真主体・短い文章・白／生成りを基調とするシンプルなデザインを、Mobile Firstの静的HTML / CSS / JavaScriptで実装しています。

最終更新：2026-10-29（STEP 09-C2-A）

## 現在の状態と基準資料

- TOP / ABOUT / COFFEE / CONTACT / ACCESSの5ページを実装。ユーザーからSTEP 01〜07および07.5の目視デザイン調整完了の連絡を受け、現在の実装を最新の制作状態として記録しています。
- **正式公開前です。公開準備完了・本番稼働中を意味しません。** 全ページの `noindex, nofollow, noarchive` とCONTACT送信無効状態を維持します。
- 基準：[要件定義書v1.6](docs/requirements/requirements_v1.6_2026-10-13.md)、[デザイン定義書v1.6](docs/design/design-system_v1.6_2026-10-13.md)、その後のユーザー明示指示とSTEP 07.5の現行実装。
- 画像の実参照・原本・派生サイズ・許可確認状態は [画像管理表](docs/asset-map.md) を参照してください。
- Cloudflareの環境準備・承認・設定確認は [導入チェックリスト](docs/operations/cloudflare-launch-checklist.md) を使用します。未確認の実値やSecretは文書に記録しません。
- Static Assetsの限定ビルドとCONTACTバックエンドはローカル実装済みです。Cloudflare実環境は未構築・未デプロイで、実Siteverifyと実メール到達は未検証です。
- `docs/requirements/requirements.md`、`docs/design/design-system.md`、`docs/references/`、`design-qa.md`、既存の `docs/qa/` は過去の資料・検証記録です。旧LPの仕様やQA結果を現行5ページ版の受入完了の根拠にはしません。
- 契約・支払・保守・公開承認の状態を実装完了から推測しません。店舗の全ページ最終承認は公開前に必要です。

## ページ構成

| ページ | URLパス | ファイル | 現在の役割 |
|---|---|---|---|
| TOP | `/` | `index.html` | スペシャルティコーヒーの第一印象、連続写真トラック、営業情報のInstagram案内、各ページへの入口 |
| ABOUT | `/about/` | `about/index.html` | SPACE / SWEETS / CULTUREを実写と短文で紹介 |
| COFFEE | `/coffee/` | `coffee/index.html` | コーヒー準備の写真、短い紹介、CURRENT BEANSの案内 |
| CONTACT | `/contact/` | `contact/index.html` | 3項目の問い合わせフォーム。バックエンドは実装済み、現在は送信不可 |
| ACCESS | `/access/` | `access/index.html` | 正式住所、Google Maps、最新営業情報へのInstagram導線、入口看板写真 |

独立したメニューページ・オンラインショップ・JOURNALページはありません。旧JOURNAL用フォルダの写真3点は現在TOPの写真トラックで使用しています。

## 技術・ディレクトリ構成

フロントエンドは静的HTML / CSS / JavaScriptを維持しています。Node.js 22以上、固定依存のWrangler 4.154.0・parse5 8.0.1と `package-lock.json` を使用し、配信用ファイルだけを `dist/` に複製します。フレームワークやバンドル処理は追加していません。

```text
index.html
about/index.html
coffee/index.html
contact/index.html
access/index.html
styles.css
script.js
README.md
AGENTS.md / CLAUDE.md
package.json / package-lock.json
wrangler.jsonc
worker/
  index.mjs       # APIルーティング
  contact/        # API・入力検証・Siteverify・メール通知・モックテスト
scripts/          # 許可リスト・build・出力検証・ローカル起動／HTTP検証
dist/             # 生成物。Git対象外、Static Assetsの配信元
docs/
  asset-map.md
  operations/cloudflare-launch-checklist.md
  requirements/   # v1.6と過去資料
  design/         # v1.6と過去資料
  references/     # 過去のデザイン参考
  qa/             # 過去の検証記録
images/
  formal ver/     # 店舗提供原本。非配信。web/には旧JPEG派生あり
  source/         # 旧素材等。既存追跡ファイルもあるため一括処理しない
  web/
    hero/
    coffee/
    sweets/
    space/
    culture/
    journal/
    logo-header.png
    favicon.png
.github/workflows/deploy-pages.yml
bashiiin_coffee_jsonld.html  # 作業用入力資料。配信対象外
```

`images/web/`直下等には未使用の旧素材も残っています。フォルダ全体を本番配信・一括追加しないでください。Workers設定・CONTACTバックエンドは実装済みですが、アカウント・本番ドメイン・Secrets・メール／レート制限bindingsは未設定です。

## デザイン・フロントエンド仕様

現行 `styles.css` の共通トークンを基準とします。v1.6の初期目安に戻すためのデザイン変更は行いません。

| 共通設定 | Mobile（〜640px） | Tablet（641〜1099px） | Desktop（1100px〜） |
|---|---|---|---|
| H1 | 40px | 48px | 64px |
| H2 | 28px | 32px | 36px |
| Eyebrow | 12px | 12px | 13px |
| 本文 | 16px | 16px | 16px |
| Eyebrow→見出し | 16px | 16px | 16px |
| 見出し→コンテンツの基本間隔 | 28px | 36px | 44px |
| セクション余白トークン | 88px | 104px | 120px |

- 日本語見出し：`Noto Serif JP` / `Hiragino Mincho ProN` / `Yu Mincho` / serif。本文はHiragino / Yu Gothic / system-ui。外部Webフォントは読み込みません。環境に存在するフォントへフォールバックします。
- 見出しweight 500・行高1.25。字間H1 `.02em` / H2 `.04em`。Eyebrowはweight 600・行高1.5・字間 `.12em`、本文はweight 400・行高1.85・字間 `.04em`。
- 共通幅は `--content-max: 1200px` と `--page-gutter` による中央コンテナ。本文は原則左揃え。Mobileの左右24pxからTablet、Desktopへ連続的に変化します。
- `--page-gutter` は基本 `clamp(24px, calc(6.25vw - 16px), 48px)`、1024px以上は `clamp(48px, calc(23.076923vw - 188.307692px), 10vw)`。共通幅は `min(1200px, 100% - 左右余白)`。
- 代表的な計算値：390pxは幅342px／左右24px、1024pxは幅928px／左右48px、1440pxは幅1152px／左右144px。ブラウザーのスクロールバー等による差は別途確認します。
- 写真・見出し・本文・リンクは同じコンテナ基準。長文は必要に応じ `--copy-max: 38em` で行長を抑えます。通常写真は `max-height: min(56svh, 520px)` と `object-fit: cover` で高さを抑え、原本比率・表示枠に応じてトリミングします。
- CONTACTはタイトルを含む本文最大680px。ACCESS本文・関連リンクは最大880px、768px以上は情報＋幅220pxの縦長写真の2カラム（間隔32〜40px・上端揃え）。ACCESSタイトルはABOUTと同じ広い共通コンテナで左揃えです。
- 共通HEADER / FOOTERに5ページナビゲーションを配置。現在ページには `aria-current="page"` を指定。Mobileメニューはキーボード、Esc、focus循環・復帰、背景の `inert` に対応し、JavaScriptが動かない場合も通常リンクを表示します。
- Lucide系のarrow-right / arrow-up-right / menu / xをinline SVGで使用。各HTMLのライセンス表記を保持します。追加ライブラリやCDNは不要です。
- テキストリンクは文字＋アイコンを1単位とし、共通gap 3px、連続する擬似要素の下線、原則44px以上の操作高さを確保しています。

### TOPの写真トラック

- 5写真の順序は画像管理表に記録。自動移動はWeb Animations APIで24 CSS px/秒。表示領域に必要なループ複製を用意し、複製は `aria-hidden` / `inert` / 空altで読み上げ・操作対象から除きます。
- PAUSE / PLAYは写真表示領域の**直下8px・右端揃え**の通常フローの独立行。写真を覆いません。操作領域は44px以上です。
- 停止・再開、停止位置からの手動閲覧、focus・pointer・wheel操作による停止に対応。`prefers-reduced-motion` では自動再生せず、設定変更にも追従します。
- 写真の表示高さはMobileで可変、Tabletで304px、Desktopで336px。画像単体を巨大化せず、表示領域は共通幅と左右均等な余白に揃えています。

## 写真・ブランド素材の管理

正式写真は原本が `images/formal ver/` に存在する店舗提供写真だけを使用します。Web最適化版を `images/web/` に置くことは可能です。ロゴ・ワードマーク・faviconだけは原本フォルダ制限の例外です。

現在は10原本由来のWebP 30ファイルとロゴ／favicon 2ファイルを参照しています。400 / 800 / 原本幅の3サイズを `srcset` / `sizes` で選択します。TOP・ABOUT・COFFEEは各ページ先頭の主写真1点にhigh priorityを設定し、それ以外の本文写真はlazy loadingです。寸法属性を保持しています。

原本の削除・移動・rename・上書き、AI生成・内容改変は行いません。派生生成は必要性と保存先を確認したうえで原本を残して行い、画像管理表に対応関係を記録します。制作使用の許可回答と、個別写真の撮影元・被写体の掲載許可・店舗の最終公開承認は区別します。

## CONTACTの現状とAPI契約

`contact/index.html` の `#contact-form` と対応するWorker APIを実装しています。**現在、APIとフォームは無効で、問い合わせは送信できません。**

- 表示項目はお名前 `name` / メールアドレス `email` / お問い合わせ内容 `message` の3つ。常時表示label、required、autocomplete、メール形式、空白のみの拒否、上限100 / 254 / 5,000文字を実装。文字数はUTF-16コード単位です。
- `data-endpoint-ready="false"`、Turnstile公開sitekeyは空、送信ボタンはdisabled。JavaScript無効時も送信不可。未設定状態ではAPI・Turnstileへ通信せず、偽成功を表示しません。
- 初期／入力エラー／送信中／成功／失敗の状態、項目別エラー、ARIA通知・focus、二重送信防止、失敗時の入力保持を用意しています。本番接続前であり、実送信・受信箱への到達は未検証です。
- 接続契約は同一オリジン `POST /api/contact`、JSONキー `name`, `email`, `message`, `turnstileToken`。HTTP 200かつJSONの `ok === true` だけ成功。HTML fallback・通信失敗・20秒タイムアウト等は成功扱いにしません。
- `worker/contact/` にAPI・入力再検証・Turnstile Siteverify・メール通知モジュールを実装済み。JSONの4フィールド以外を拒否し、HTTP本文はストリーム読み取り時から48KiBに制限します。Siteverifyのsuccess・hostname・action=`contact`を照合し、単回使用・期限切れ判定はCloudflareへ委ねます。実認証は未検証です。
- `CONTACT_API_ENABLED` と `EMAIL_SENDING_ENABLED` は厳密に文字列 `"true"` の場合のみ許可。現在はいずれも `"false"`。Secret・正規HTTPS origin・hostname・送信元／宛先・`EMAIL` と `CONTACT_RATE_LIMITER` の両bindingも必須で、未設定時は本文読み取り・外部通信より前に503を返します。フラグだけでは送信できません。
- メールは固定のサーバー側送信元／宛先と検証済みReply-Toを使うプレーンテキスト通知です。自動返信なし。`EMAIL.send()` の受付結果 `messageId` を確認してから成功応答を返します。サービス受付と受信箱への到達は別で、実メール到達は未検証です。
- レート制限bindingは個人情報を含まない共通キーを使う設計です。未設定・障害時は503、制限超過は429。利用者間の共有枠・地域単位の概算制限・環境別namespace・未確定の閾値は導入チェックリストで管理します。
- 公開sitekey、許可hostname、Siteverify secret、正式な送信元／検証済み送信先、Email Service `send_email` binding等は後工程で設定・確認します。secretをフロントやGitに保存しません。
- 入力値・tokenをconsole、URL、Analytics、Workerログへ出しません。フォーム値をlocalStorage等へ保存しません。自動再送はありません。メール受付後の通信断・タイムアウト後に新トークンで再送すると重複通知し得ます。現在、冪等性キーやDBはなく、許容方針・必要な追加対策は本番有効化前に決めます。
- `form_start`、`form_submit`、成功応答時だけ1回の `generate_lead` の経路を用意しています。`bashiiin:analytics` と任意のdataLayer連携はGA4導入済みの証拠ではありません。現在の開発用console出力もイベント情報のみで、入力値・tokenを含みません。GA4接続時はフォーム拡張計測との重複・個人情報非送信を確認します。

## SEO・JSON-LD

- 5ページそれぞれにtitle / description / robotsを設定し、全ページ `noindex, nofollow, noarchive` を維持。正式なcanonical・OGP・sitemap・robots.txt・GA4接続は未整備です。
- TOPの `<head>` に `application/ld+json` を1つ設置。JSON-LDの掲載項目は `@context` / `@type: CafeOrCoffeeShop` / `name` / 確認済み内容の `description` / `address` / Instagramの `sameAs`。
- メニューページがないため `menu`、固定営業時間を掲載しないため `openingHoursSpecification` を除外しています。
- 正式ドメイン未確定のため `@id` / `url` / `image` / `logo` は省略。公開時に確定済みの絶対URLで追加し、ACCESSの実表示と整合させます。推測ドメイン・example.com・架空画像URLは設定しません。
- `alternateName` / `priceRange` / `currenciesAccepted` / `geo` / `hasMap` / `servesCuisine` / `acceptsReservations` / `postalCode` は未確認のため掲載していません。必要な項目だけ店舗確認後に検討します。自家焙煎・自家製・人気等を補完しません。
- JSON-LD image候補は `images/web/space/DSC_0167-1450.webp` または `images/web/hero/DSC_0052-1450.webp`、logo候補は `images/web/logo-header.png`。OGP写真候補は後者ですが、最終選定・比率・本番URLは未確定です。
- 提供原稿 `bashiiin_coffee_jsonld.html` は未確認値・仮URLを含む入力資料です。公開用HTMLとして配信・一括Git追加しません。

## ビルド・テスト・ローカル配信

ルート相対パスを使用するため、`file://`ではなくローカルHTTPで確認します。Node.js 22以上とlockfileに対応する依存が導入済みの環境で、リポジトリルートから既存npm scriptsを使用します。

```sh
npm run build
npm run verify:dist
npm test
```

- `build`：`scripts/public-files.json` の明示的な許可リストを検査し、39ファイルだけを `dist/` に複製します。5 HTML＋CSS/JS 2件＋WebP 30件＋ロゴ/favicon 2件です。
- 参照切れ・許可リスト外参照・未使用の許可ファイル・パス逸脱・シンボリックリンク・原本の対応／ハッシュ不一致を拒否します。固定の生成先を置き換え、旧出力の残存を防ぎます。
- `verify:dist`：出力一覧が許可リストと完全一致し、内容もソースと一致するか検証します。
- `test`：静的ビルド12テストとCONTACT API関連テストを実行します。Siteverify・メール・レート制限はメモリー内モックで、実認証・実メール送信は行いません。

ローカル配信は別のターミナルで起動します。

```sh
npm run dev
```

これはbuild後に `scripts/dev-local.mjs` からWranglerの `dev --local` を起動し、`http://127.0.0.1:8787` で配信します。リモートbinding・公開トンネル・デプロイを使用せず、認証用環境変数も子プロセスから除外します。終了はCtrl+Cです。同じポートの既存サーバーがある場合は二重起動しません。

- ページ：`/`、`/about/`、`/coffee/`、`/contact/`、`/access/`
- サーバー起動中、別ターミナルで次を実行します。

```sh
npm run verify:local
```

`verify:local` はloopbackのみを対象とし、配信ファイルの内容・Content-Type、末尾スラッシュへの転送、未知URL・非公開資料の404、無効APIのPOST 503等を確認します。ブラウザー表示や実メールのテストではありません。

STEP 09-A／09-Bのローカル検証では、build・出力検証、計109自動テスト、72項目のWrangler HTTP検証が通過済みです。STEP 09-C2-Aでは `npm run verify:dist` を再実行し、39ファイルの一致を確認しました。build・自動テスト・HTTP検証は再実行していません。実Siteverify・メール到達・Cloudflare実環境・全6幅の最終ブラウザーQAは未検証です。

現在のビルドは全5ページのnoindexとCONTACT無効・Site Key未設定を必須条件にしています。将来のフォーム有効化や検索公開では、これらの検証条件の変更も別途承認・レビューが必要です。検証を迂回して公開しません。

### Staging専用のTurnstile表示検証ビルド

通常の `npm run build` / `verify:dist` は変更せず、Site Key空・フォーム無効の `dist/` を生成・検査します。追加した `npm run build:staging` / `verify:staging` は、環境変数 `STAGING_TURNSTILE_SITE_KEY` から公開用Site Keyだけを読み、独立した `dist-staging/` の39ファイルを生成・検査します。Secretを渡したり、キーをソースや設定ファイルへ保存したりしません。

- Staging出力はCONTACTのSite Key・表示専用mode・許可hostname属性だけが通常出力と異なります。他の38ファイルは同一です。ソースHTMLは変更しません。
- 表示には `staging-verify-only` と固定HTTPS origin `https://bashiiin-coffee-staging.misemiruweb.workers.dev` の一致が必要です。URLパラメータで有効化しません。既存のloopback限定 `verify-only` は維持します。
- 表示専用モードでは、認証成功後も送信disabled・submit拒否・POSTなし・generate_leadなし。API／メールの無効設定も維持します。
- Site Key未設定・形式不正、Worker名・配信先・無効フラグ等の不一致ではビルド／検証が失敗します。形式検査はキーの有効性やwidget所属の実認証を保証しません。
- `wrangler.staging.jsonc` の配信元は `./dist-staging` です。通常の `dist/` を使い回しません。生成物はいずれもGit対象外です。失敗時は以前の出力を配信せず、成功したbuildとverifyの両方を確認します。
- キーをコマンド引数や履歴に直書きせず、承認後に対話入力した一時環境変数を利用します。両コマンドを同じ環境変数で実行後、unsetします。実キー入力・デプロイ・Secret登録は別の明示許可が必要です。
- 自動テストは公式ダミーSite Keyとモックだけを使用します。`scripts/contact-form.browser.mjs` は既存Playwrightとローカルサーバーを使い、Staging生成HTMLのloopback拒否も確認します。実際のStaging接続・実Siteverifyとは区別します。

## Cloudflare Workersの現在の構成

- `wrangler.jsonc` のStatic Assets配信元は `./dist`、bindingは `ASSETS`。
- Worker `worker/index.mjs` が `/api/*` を優先処理。`/api/contact` はCONTACT API、未知APIはJSON 404です。
- `html_handling: force-trailing-slash`、`not_found_handling: none`。未知URLをTOPの200へ置き換えるSPA fallbackはありません。
- `workers_dev: false`、`preview_urls: false`、アカウント・正式ドメイン・routeは未設定。設定上のWorker名はローカル識別子で、実在するCloudflareプロジェクトを意味しません。
- `dist/`、`node_modules/`、`.wrangler/`、ローカルSecretファイルはGit保存対象外。Workerソース・設定・docs・原本・未使用画像・入力資料はStatic Assetsへ含めません。
- Cloudflare実環境は未構築・未デプロイです。今後の準備は [導入チェックリスト](docs/operations/cloudflare-launch-checklist.md) に従い、ログイン・設定・検証環境への配置・実送信はそれぞれ許可された工程だけで行います。

## Git運用と正式配信方針

- repository：`misemiru-web/Bashiiin--coffee`
- `main`：既存の営業サンプル用。`formal-production`：正式5ページ版の制作branch。正式版を不用意にmainへ反映しません。
- 営業サンプルと正式版の公開環境は分離します。commit / push / merge / deployはそれぞれ明示許可のある工程だけで行います。
- `.github/workflows/deploy-pages.yml` はmain pushおよび手動起動でGitHub Pagesへ配信する既存設定です。**正式5ページ版へ流用しません。** 現在の収集処理はルートの3ファイル中心で、サブページを含まず、先頭 `/` の画像パスも収集しないため現行構成に対応していません。workflowは今回変更しません。
- 正式版のCloudflare Workers Static Assets向け限定ビルド・Workerはローカル実装済みです。本番アカウント・ドメイン・DNS・HTTPS・アクセス制御・自動連携設定は未確認で、デプロイは未実施です。
- 原本、未使用素材、旧AI仮素材、入力資料、docs、ローカル設定、認証情報を本番配信へ含めません。Gitで保存するかどうかと配信対象かどうかは別の判断です。
- 保存前は差分・既存変更・未追跡・画像参照・secretを個別確認し、`git add .`や`git add -A`による一括追加を避けます。原本を理由なく追加しません。既存追跡済みの旧素材も無断で削除しません。

## 今後の実装・公開前確認

以下は未実装・未完了です。

1. 実装済みのCloudflare Workers配信基盤を、承認されたアカウント・検証環境へ接続。本番ドメイン・HTTPS・アクセス制御と営業サンプルとの分離。
2. 実装済みCONTACT APIの実Siteverify・メール受付／到達確認。送信元・送信先、binding/Secret、レート制限・重複通知方針の確定。API・フォーム有効化は後続の承認工程で判断。
3. 正式URLを使用するcanonical / OGP / JSON-LD / sitemap / robots.txt等のSEO最終設定、GA4・Search Consoleの接続と実環境検証。
4. 最新の豆情報・必要な新作情報、住所とGoogle Mapsの正しい店舗ピン、写真掲載許可・撮影元・人物等の権利、5ページの掲載内容の最終確認。
5. 360 / 390 / 430 / 768 / 1024 / 1440pxの**全6幅・全ページの実ブラウザー最終QA**。制作中の個別確認と最終受入QAは区別し、iOS Safari / Android Chrome、keyboard / focus、カルーセル、画像品質、性能、実送受信・GA4受信等を確認します。
6. 店舗による全ページの「公開OK」の文章承認と、要件上の公開条件の確認。その後、別の公開工程でnoindex解除を判断します。

現時点を公開準備完了とは扱いません。正式ドメイン・権限・最終承認・サービス利用条件を推測して設定しないでください。
