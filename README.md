# Bashiiin! coffee 正式Webサイト

京都・河原町のスペシャルティコーヒー店、Bashiiin! coffeeの正式Webサイト制作リポジトリです。写真主体・短い文章・白／生成りを基調とするシンプルなデザインを、Mobile Firstの静的HTML / CSS / JavaScriptで実装しています。

最終更新：2026-10-28（STEP 08-A）

## 現在の状態と基準資料

- TOP / ABOUT / COFFEE / CONTACT / ACCESSの5ページを実装。ユーザーからSTEP 01〜07および07.5の目視デザイン調整完了の連絡を受け、現在の実装を最新の制作状態として記録しています。
- **正式公開前です。公開準備完了・本番稼働中を意味しません。** 全ページの `noindex, nofollow, noarchive` とCONTACT送信無効状態を維持します。
- 基準：[要件定義書v1.6](docs/requirements/requirements_v1.6_2026-10-13.md)、[デザイン定義書v1.6](docs/design/design-system_v1.6_2026-10-13.md)、その後のユーザー明示指示とSTEP 07.5の現行実装。
- 画像の実参照・原本・派生サイズ・許可確認状態は [画像管理表](docs/asset-map.md) を参照してください。
- `docs/requirements/requirements.md`、`docs/design/design-system.md`、`docs/references/`、`design-qa.md`、既存の `docs/qa/` は過去の資料・検証記録です。旧LPの仕様やQA結果を現行5ページ版の受入完了の根拠にはしません。
- 契約・支払・保守・公開承認の状態を実装完了から推測しません。店舗の全ページ最終承認は公開前に必要です。

## ページ構成

| ページ | URLパス | ファイル | 現在の役割 |
|---|---|---|---|
| TOP | `/` | `index.html` | スペシャルティコーヒーの第一印象、連続写真トラック、営業情報のInstagram案内、各ページへの入口 |
| ABOUT | `/about/` | `about/index.html` | SPACE / SWEETS / CULTUREを実写と短文で紹介 |
| COFFEE | `/coffee/` | `coffee/index.html` | コーヒー準備の写真、短い紹介、CURRENT BEANSの案内 |
| CONTACT | `/contact/` | `contact/index.html` | 3項目の問い合わせフォームの静的初稿。現在は送信不可 |
| ACCESS | `/access/` | `access/index.html` | 正式住所、Google Maps、最新営業情報へのInstagram導線、入口看板写真 |

独立したメニューページ・オンラインショップ・JOURNALページはありません。旧JOURNAL用フォルダの写真3点は現在TOPの写真トラックで使用しています。

## 技術・ディレクトリ構成

build工程、`package.json`、lockfile、npm依存、フレームワークはありません。HTMLを静的配信し、共通CSSとJavaScriptを直接読み込みます。

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
docs/
  asset-map.md
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

`images/web/`直下等には未使用の旧素材も残っています。フォルダ全体を本番配信・一括追加しないでください。Workers設定・CONTACTバックエンドは未作成です。

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

## CONTACTの現状と後続API契約

`contact/index.html` の `#contact-form` はフロントエンドの静的初稿です。**現在、問い合わせは送信できません。**

- 表示項目はお名前 `name` / メールアドレス `email` / お問い合わせ内容 `message` の3つ。常時表示label、required、autocomplete、メール形式、空白のみの拒否、上限100 / 254 / 5,000文字を実装。文字数はUTF-16コード単位です。
- `data-endpoint-ready="false"`、Turnstile公開sitekeyは空、送信ボタンはdisabled。JavaScript無効時も送信不可。未設定状態ではAPI・Turnstileへ通信せず、偽成功を表示しません。
- 初期／入力エラー／送信中／成功／失敗の状態、項目別エラー、ARIA通知・focus、二重送信防止、失敗時の入力保持を用意しています。サーバーがない現状で実送信の成功を保証しません。
- 接続契約は同一オリジン `POST /api/contact`、JSONキー `name`, `email`, `message`, `turnstileToken`。HTTP 200かつJSONの `ok === true` だけ成功。HTML fallback・通信失敗・20秒タイムアウト等は成功扱いにしません。
- Worker/API、サーバー側再検証、Turnstile Siteverify、本番認証、メール通知は未実装・未接続です。Worker側で入力・サイズ制限、不正リクエスト対策、hostname/action=`contact`、期限切れ・再利用token拒否を実装し、メール通知完了後だけ成功応答を返す必要があります。
- 公開sitekey、許可hostname、Siteverify secret、正式な送信元／検証済み送信先、Email Service `send_email` binding等は後工程で設定・確認します。secretをフロントやGitに保存しません。
- 入力値・tokenをconsole、URL、Analytics、Workerログへ出しません。フォーム値をlocalStorage等へ保存しません。タイムアウト時の再送による重複通知対策はWorker側で検討します。
- `form_start`、`form_submit`、成功応答時だけ1回の `generate_lead` の経路を用意しています。`bashiiin:analytics` と任意のdataLayer連携はGA4導入済みの証拠ではありません。現在の開発用console出力もイベント情報のみで、入力値・tokenを含みません。GA4接続時はフォーム拡張計測との重複・個人情報非送信を確認します。

## SEO・JSON-LD

- 5ページそれぞれにtitle / description / robotsを設定し、全ページ `noindex, nofollow, noarchive` を維持。正式なcanonical・OGP・sitemap・robots.txt・GA4接続は未整備です。
- TOPの `<head>` に `application/ld+json` を1つ設置。JSON-LDの掲載項目は `@context` / `@type: CafeOrCoffeeShop` / `name` / 確認済み内容の `description` / `address` / Instagramの `sameAs`。
- メニューページがないため `menu`、固定営業時間を掲載しないため `openingHoursSpecification` を除外しています。
- 正式ドメイン未確定のため `@id` / `url` / `image` / `logo` は省略。公開時に確定済みの絶対URLで追加し、ACCESSの実表示と整合させます。推測ドメイン・example.com・架空画像URLは設定しません。
- `alternateName` / `priceRange` / `currenciesAccepted` / `geo` / `hasMap` / `servesCuisine` / `acceptsReservations` / `postalCode` は未確認のため掲載していません。必要な項目だけ店舗確認後に検討します。自家焙煎・自家製・人気等を補完しません。
- JSON-LD image候補は `images/web/space/DSC_0167-1450.webp` または `images/web/hero/DSC_0052-1450.webp`、logo候補は `images/web/logo-header.png`。OGP写真候補は後者ですが、最終選定・比率・本番URLは未確定です。
- 提供原稿 `bashiiin_coffee_jsonld.html` は未確認値・仮URLを含む入力資料です。公開用HTMLとして配信・一括Git追加しません。

## ローカルプレビュー

ルート相対パスを使用するため、`file://`でHTMLを開かず、**リポジトリルートをHTTPサーバーのルート**にしてください。Python 3が使える環境で、リポジトリルートから起動します。

```sh
python3 -m http.server 8875 --bind 127.0.0.1
```

この環境では利用可能なPython 3実行ファイルによる同じ起動引数のサーバーと、`http://127.0.0.1:8875/contact/` のHTTP 200を確認しました。Pythonのインストール先・PATHは環境に合わせて確認してください。既に8875で起動中なら二重起動せず既存サーバーを使用します。

- TOP: `http://127.0.0.1:8875/`
- ABOUT: `http://127.0.0.1:8875/about/`
- COFFEE: `http://127.0.0.1:8875/coffee/`
- CONTACT: `http://127.0.0.1:8875/contact/`
- ACCESS: `http://127.0.0.1:8875/access/`

このサーバーは確認用で、API・メール送信・本番の配信対象制限は実装しません。原本・管理資料にも到達し得るため外部公開しないでください。専用build / lint / testコマンドはありません。

## Git運用と正式配信方針

- repository：`misemiru-web/Bashiiin--coffee`
- `main`：既存の営業サンプル用。`formal-production`：正式5ページ版の制作branch。正式版を不用意にmainへ反映しません。
- 営業サンプルと正式版の公開環境は分離します。commit / push / merge / deployはそれぞれ明示許可のある工程だけで行います。
- `.github/workflows/deploy-pages.yml` はmain pushおよび手動起動でGitHub Pagesへ配信する既存設定です。**正式5ページ版へ流用しません。** 現在の収集処理はルートの3ファイル中心で、サブページを含まず、先頭 `/` の画像パスも収集しないため現行構成に対応していません。workflowは今回変更しません。
- 正式版は今後Cloudflare Workers Static Assetsで配信する予定です。実装・本番設定は未完了。5 HTML・共通CSS/JS・実参照素材だけを許可する配信対象の限定が必要です。
- 原本、未使用素材、旧AI仮素材、入力資料、docs、ローカル設定、認証情報を本番配信へ含めません。Gitで保存するかどうかと配信対象かどうかは別の判断です。
- 保存前は差分・既存変更・未追跡・画像参照・secretを個別確認し、`git add .`や`git add -A`による一括追加を避けます。原本を理由なく追加しません。既存追跡済みの旧素材も無断で削除しません。

## 今後の実装・公開前確認

以下は未実装・未完了です。

1. Cloudflare Workers Static Assets、5ページ対応の配信対象限定、本番ドメイン・HTTPSと営業サンプルとの分離。
2. CONTACT API、サーバー側再検証・Siteverify、メール通知・実送信／到達確認。正式な送信元・送信先と必要なbinding/secretの安全な設定。
3. 正式URLを使用するcanonical / OGP / JSON-LD / sitemap / robots.txt等のSEO最終設定、GA4・Search Consoleの接続と実環境検証。
4. 最新の豆情報・必要な新作情報、住所とGoogle Mapsの正しい店舗ピン、写真掲載許可・撮影元・人物等の権利、5ページの掲載内容の最終確認。
5. 360 / 390 / 430 / 768 / 1024 / 1440pxの**全6幅・全ページの実ブラウザー最終QA**。制作中の個別確認と最終受入QAは区別し、iOS Safari / Android Chrome、keyboard / focus、カルーセル、画像品質、性能、実送受信・GA4受信等を確認します。
6. 店舗による全ページの「公開OK」の文章承認と、要件上の公開条件の確認。その後、別の公開工程でnoindex解除を判断します。

現時点を公開準備完了とは扱いません。正式ドメイン・権限・最終承認・サービス利用条件を推測して設定しないでください。
