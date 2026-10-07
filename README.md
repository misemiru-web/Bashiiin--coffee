# Bashiiin! coffee

Bashiiin! coffeeのWebサイトを管理するリポジトリです。コードとGit設定から確認できる事実を記録し、業務状態や公開状態が未確認の項目は `要確認` としています。

## 1. 基本情報・現在の状態

- 案件名: Bashiiin! coffee
- 内容: 店舗情報を掲載する静的Webサイト
- 現在のHTML title: `Bashiiin! coffee | SPECIALTY COFFEE / KYOTO`
- robots設定: `noindex, nofollow, noarchive`
- 現在の制作・承認・公開・保守状態: 要確認
- 正式な公開URL: 要確認
- README最終更新日: 2026-10-07

上記のコード表記は確認済みですが、現在の契約区分や公開判断を示すものとは断定しません。

## 2. Repository

- GitHub: https://github.com/jiandouchuiming-cell/Bashiiin--coffee.git
- 基準branch: `main`
- 公開済み安定版を示すcommit / tag: 要確認

## 3. 技術構成

- HTML / CSS / JavaScript
- package manager: なし
- `package.json`: なし
- Node.js指定: なし
- 専用build工程: なし

## 4. セットアップ・確認方法

依存関係のインストールは不要です。専用の開発起動・buildコマンドはありません。ルートの `index.html` と関連ファイルを静的サイトとして確認します。

### Build

- buildコマンド: なし
- build出力先: なし

存在しないnpmコマンドを追加・実行しないでください。

## 5. 主な構成と更新箇所

- `index.html`: 店舗情報、本文、主要リンク、SEO情報
- `styles.css`: レイアウトと見た目
- `script.js`: 画面動作、独自分析イベント、dataLayer連携処理
- `images/web/`: サイトで利用する主な画像
- `images/source/`: 元素材用の場所。Git追跡状況を確認して扱う
- `.github/workflows/deploy-pages.yml`: GitHub Pagesデプロイworkflow

店舗情報を変更するときは `index.html` 内の重複表記を確認します。画像差し替えでは公開用と元素材を混同せず、権利とGit追跡状況を確認します。

## 6. 外部サービス・フォーム・解析

- Instagramへの外部リンク
- Googleマップへの外部リンク（Footer内の補助導線。地図埋め込み・独立ACCESSなし）
- 外部Webフォントの読み込みなし（現在のHTML）
- CONTACTフロントエンド: `POST /api/contact` のJSON送信・入力検証・状態表示を実装。Worker・メール送信は未実装、現在は送信無効。
- Search Console設定: 要確認
- GA4タグ: コード上では確認できない
- `script.js`: 独自イベント `bashiiin:analytics` を送出し、dataLayerが存在する場合にデータを追加

上記JavaScriptだけを根拠に、GA4が導入・運用中とは判断しません。

## 7. SEO

- `title`、description、robots等は主に `index.html` で管理
- 現在のrobots: `noindex, nofollow, noarchive`
- `noindex` を外す条件と承認者: 要確認
- canonical: コード上では確認できない

## 8. 公開・ホスティング・ドメイン

- デプロイ方式: `.github/workflows/deploy-pages.yml` が `main` へのpushでGitHub Pagesへ参照中の静的ファイルをデプロイ
- 現在実際に公開中か: 要確認
- 正式な公開URL: 要確認
- 独自ドメイン、DNS、所有者: 要確認

`main` へのpushはデプロイを起動し得るため、公開可否を確認せず実行しないでください。

## 9. QA・素材・引継ぎ

- リポジトリ内の公開前QAチェックリスト: 確認できない
- 画像・文章の利用許諾範囲: 要確認
- 公開前の確認者・承認条件: 要確認
- 復元はGit履歴を基準にし、安定版commit / tagは関係者へ確認する

共通QAテンプレートはリポジトリへ自動コピーせず、必要時に別途適用します。

## 10. 未確認事項

- 現在の案件状態、公開状態、承認状態、保守範囲
- 正式な公開URL、独自ドメイン、DNS
- `noindex` を外す時期・条件
- Instagram、Googleマップの正式な運用先
- Search Console / GA4の導入・管理状況
- 素材の権利確認状況、公開前QAと承認記録

## 11. 認証情報

パスワード、APIキー、秘密トークン、個人情報をREADMEやGitへ保存しないでください。必要な認証情報の保管先と共有方法は、関係者へ確認してください。

## 12. CONTACTの実装と後続Workerの契約

- HTML: `index.html` の `#contact-form`。表示項目は `name` / `email` / `message` の3項目だけ。
- 入力上限: 名前100、メール254、本文5,000。フロントはUTF-16コード単位（`value.length` / `maxlength`）で検証。Workerも同じ上限、必須、空白のみ、メール形式を再検証する。
- 現在は `data-endpoint-ready="false"`、`#contact-turnstile` の `data-sitekey` は空。送信不可を表示し、APIやTurnstileへ通信しない。JavaScript無効時も送信ボタンは無効。
- Workerの実装・Siteverify・メール送信の実環境テスト完了後に、正式な公開sitekeyを設定し `data-endpoint-ready="true"` にする。secret・メールサービス認証情報をHTML/JSへ書かない。
- Turnstileは公式APIを明示的にrender。入力用の項目を増やさず、callbackのトークンをメモリ内だけで保持する。期限切れ・エラーでは送信不可。送信試行後はresetし、新しいトークンを取得する。
- 送信契約: 同一オリジン `POST /api/contact`、`Content-Type: application/json`、本文キーは `name`, `email`, `message`, `turnstileToken`。URLクエリには入力値を入れない。
- Workerはサーバー側の入力検証、Turnstile Siteverify（hostname / action=`contact`も確認）、メール通知完了後だけHTTP 200 / JSON `{ "ok": true }` を返す。未検証・期限切れ・再利用トークンを拒否する。その他は非成功のHTTPステータスと入力値を含まない応答にする。
- フロントはHTTP 200＋JSONの `ok === true` のみ成功扱い。HTML fallback、不正JSON、API未実装、通信失敗、20秒のタイムアウトは成功にしない。失敗時は入力を保持し、自動再送しない。
- メールサービス側で成功した後に通信が切れる可能性もあるため、再送時の重複通知対策はWorker側で検討する。タイムアウト表示は「送信を確認できませんでした」とする。
- `form_start` は最初の入力、`form_submit` は検証後のPOST試行、`generate_lead` は成功応答時だけ1回。既存 `bashiiin:analytics` / dataLayer の同一経路を使い、入力値・トークン・API応答・エラー内容は計測やconsoleへ送らない。フォーム値はlocalStorage等へ保存しない。
- GA4測定IDと本番連携は未設定。将来この独自イベントをGA4へ接続する際は送信経路を1つにし、拡張計測のフォームイベントとの重複を避ける。Googleタグ側からも入力値を収集しない。
- 公開前: Worker / Static Assetsの同一サイト配信、Siteverify secret・許可hostname、公開sitekey、Email Service `send_email` binding・正式ドメインの送信元・検証済み送信先、入力検証・サイズ制限・不正リクエスト対策・ログの個人情報非出力を確認。DBへの恒常保存・自動返信は行わない。
- 本番のSiteverify・メール到達・GA4受信は未検証。フロントのテストで応答を置き換えても、これらの完了を意味しない。

## 13. JSON-LD

- 店舗提供の `bashiiin_coffee_jsonld.html` を入力資料とし、`index.html` の `<head>` に `application/ld+json` を1つ設置。独立した店舗情報ページは追加しない。
- 現在の掲載項目: `@context`、`@type= CafeOrCoffeeShop`、`name`、確認済み内容に修正した `description`、正式住所に合わせた `address`、Instagramの `sameAs`。
- `menu` はメニューページを設けないため除外。`openingHoursSpecification` は固定営業時間を掲載しない方針のため除外。
- `alternateName`、`priceRange`、`currenciesAccepted`、`geo`、`hasMap`、`servesCuisine`、`acceptsReservations`、住所の `postalCode` は未確認のため除外。掲載が必要な項目だけ、店舗確認後に反映する。提供descriptionの未確認の製法・人気表現は使用しない。
- 正式ドメインは未確定。`@id`、`url`、`image`、`logo` は値を推測せず、現在のJSON-LDには含めていない。公開前に正規トップページの絶対URL、同URLに `#shop` を付けた一意の `@id`、実ファイルの本番絶対URLを追加する。
- `image` 候補: `images/formal ver/web/DSC_0167-1450.jpg`（店内）、`images/formal ver/web/DSC_0052-1450.jpg`（コーヒー）。正式素材フォルダ内の原本から生成し、SPACE / COFFEEで使用。`logo` 候補: HEADER / FOOTERで使用中の `images/web/logo-header.png`。本番で各URLから画像が取得できることも確認する。
- `index.html` のJSON-LDには `example.com` を残さない。提供原稿は改変せず保存しているため、原稿内には仮URL・未確認値が残る。原稿は公開アセットに含めないこと。GitHub Pages workflowはページと参照アセットだけを一時ディレクトリへコピーし、原稿・README・元写真を配信しない。本番Cloudflareでも同じ配信範囲を使い、リポジトリrootをそのままStatic Assetsにしない。
- 現在のrobots `noindex, nofollow, noarchive` は維持。ドメイン・画像URL追加と検索公開への切り替えは、公開工程で別途確認する。

## 14. 正式版の写真素材ルール

- 写真は原本が `images/formal ver/` に存在するもののみ使用する。HERO、全セクション、OGP、JSON-LDのimage、背景写真にも適用する。原本由来のWeb最適化版は `images/web/` 等でも使用可能。保存先だけで可否を判断せず、原本との対応を確認する。営業サンプル専用写真や出所不明の写真は使用しない。
- ロゴ・ブランドマーク・faviconのみフォルダ制限の例外。現在のブランド素材は `images/web/logo-header.png`、`images/web/favicon.png`。
- 原本6枚は変更せず保存。拡張子は `.webp` だが実形式はJPEG。表示用のJPEGは `images/formal ver/web/` に元ファイル名＋幅の命名で生成し、向きを正規化・EXIFを除去。400px / 800px / 原本の表示幅を用意する。HTMLのパスでは空白を `%20` にエンコードする。
- AI生成、AIによる内容改変、未確認の商品名の断定は行わない。別写真を優先し、不足時は必要最小限の重複、次に枚数削減とする。重複は使用箇所を報告する。
- OGPは未確定。写真候補は `DSC_0052.webp`（コーヒーと店舗カード）。作成・採用は公開工程で確認する。

| 原本（images/formal ver/） | 実内容 | 表示用JPEGの最大幅 |
|---|---|---|
| DSC_0052.webp | コーヒー入りサーバー・グラス・カード、奥にプリン | DSC_0052-1450.jpg |
| DSC_0132.webp | 氷入りドリンク・焼き菓子・カード | DSC_0132-1450.jpg |
| DSC_0165.webp | イラスト入りTシャツ・レンガ壁 | DSC_0165-1450.jpg |
| DSC_0167.webp | カウンター・テーブル・コーヒー器具のある店内 | DSC_0167-1450.jpg |
| R0000476.webp | プリン・皿・スプーン | R0000476-1920.jpg |
| R0002506.webp | グラスに盛られた層状のスイーツ。商品名は未確定 | R0002506-1280.jpg |

- 豆・パッケージ、抽出中、外観・入口の専用写真はこの6枚にない。必要時は店舗の追加素材確認待ちとし、旧写真へ戻らない。CURRENT BEANSの豆情報も引き続き確認待ち。

## 15. 全体レビュー修正と配信範囲

- 独立ABOUTと未確認の店舗体験コピーは削除済み。LATEST INFOからCOFFEEへ直接続く。
- HEROの停止位置を保持するため、写真列1周＋表示領域分を満たすループ複製を確保。複製はaria-hidden / inert / 空altで読み上げ・focusから除外。写真配分の重複承認とは別の、同一ギャラリー内の処理。
- CURRENT BEANSは案内のみの間 `current-beans--pending` で余白を縮小。確認済みの豆・写真・更新時点を掲載する際は、このクラスを外して編集リストの寸法を再確認する。
- COFFEEの反復本文を削除。見出しと大判写真は維持。
- `.github/workflows/deploy-pages.yml` はHTMLのimg / srcset / faviconとCSSの画像参照を抽出し、index.html / styles.css / script.jsと実際の参照アセットだけを配信対象にする。入力資料、管理文書、元素材は含めない。公開先・main push起動は変更しない。実デプロイは未実施。
- HEROはDSC_0052 → DSC_0132 → DSC_0167の3枚へ差し替え済み。JOURNALの `images/web/journal/` は正式原本由来であることを画素比較と内容確認で検証し、同じ原本のEXIF除去済み `formal ver/web/` へ参照を統一。全写真参照の不適合は0件。写真監査完了は本番公開承認・送信基盤の完成を意味しない。
- 公開前: 店舗の豆情報・新作情報・Mapピン・最終承認、本番ドメインとSEO、Worker / Siteverify / メール送信、GA4 / Search Console、Cloudflare配信・HTTPS、実機と性能の確認が必要。送信無効とnoindexは維持する。


## 16. 写真の出所監査（2026-10-07）

- 表示用JPEGの元写真は以下の対応表で管理。原本のSHA-256は下記に記録し、原本自体は上書き・加工していない。
- JOURNALの400 / 800 / 1,200px画像は、各原本を同寸法へ縮小した画像と比較して対応を確認した。JOURNALの旧参照は正式原本由来で使用可能だが、撮影メタデータを持たない既存の最適化版へ統一した。対応は drink → DSC_0132.webp、interior → DSC_0167.webp、pudding → R0000476.webp。HERO旧写真（coffee-cup / entrance-door / brewing-station）には正式原本がないため参照を解除。旧ファイルは削除していない。
- 使用中の最適化版だけをGit対象にする。元写真、未使用派生画像、提供JSON-LD原稿はローカルに保持し、静的配信対象へ含めない。

| 表示ファイル（各幅を含む） | 原本（images/formal ver/） | 使用箇所 | 分類 |
|---|---|---|---|
| formal ver/web/DSC_0052-{400,800,1450}.jpg | DSC_0052.webp | HERO 1 / COFFEE | B |
| formal ver/web/DSC_0132-{400,800,1450}.jpg | DSC_0132.webp | HERO 2 / JOURNAL 1 | B |
| formal ver/web/DSC_0167-{400,800,1450}.jpg | DSC_0167.webp | HERO 3 / SPACE / JOURNAL 2 | B |
| formal ver/web/DSC_0165-{400,800,1450}.jpg | DSC_0165.webp | CULTURE | B |
| formal ver/web/R0000476-{400,800,1920}.jpg | R0000476.webp | SWEETS / JOURNAL 3 | B |
| web/logo-header.png / web/favicon.png | 正式ブランド素材（写真ではない） | HEADER / FOOTER / favicon | C |

上記の表示ファイルはすべて `images/` 配下。分類Aは正式原本の直接使用、Bは正式原本由来のWeb最適化版、Cはロゴ等、Dは不適合。現在はBが15ファイル、Cが2ファイル、A / Dは0件。

重複はDSC_0052（HERO / COFFEE）、DSC_0132（HERO / JOURNAL）、DSC_0167（HERO / SPACE / JOURNAL）、R0000476（SWEETS / JOURNAL）。正式写真の出所を優先し、各ギャラリー内では異なる被写体を選んだ。原本R0002506は商品名未確定のため現在の表示には使わない。HEROは5〜7枚の目安に届かないが、旧写真で補わず3枚を維持。JOURNALも既存の正式原本由来3枚を維持する。

| 原本 | SHA-256 |
|---|---|
| DSC_0052.webp | 07507bab2cd14abd241b538e6cbffd83bc4dedc9ba146a99c5c54d957eb0ad5a |
| DSC_0132.webp | 5a72bf5c5642d9bb8ef99ddc4f8657f37e535c1e19bbb0e7623d669ddd4319fa |
| DSC_0165.webp | 400a7e2890118d2b60ca83caf3bcd6dce89af812a39564592db5a6caf1f27bb1 |
| DSC_0167.webp | ecccbd75db17ad4ffd42d3ad75686fa775097bb8efdeeb11019137a4a71d70a6 |
| R0000476.webp | b88bff4c7c22eb38e40f3a73ec7427df1affd95b0a173966757526525c6f912e |
| R0002506.webp | 637509bc24dc75f05a7bb9ab66ec2b0348c7e2be53970c9ba623de808c6af0b8 |


## 17. formal-productionの履歴統合

- リモートの既存3commitは履歴・追加資料を保持してmerge。競合したHTML / CSS / JavaScriptは、v1.5と最新の写真ルール・フォーム仕様に基づく検証済み実装を採用した。
- `docs/`、`design-qa.md` はリモートにあった過去の資料・検証記録として保持。v1.3資料や旧実装の画面は現在の受入基準ではなく、指定のv1.5資料と最新ユーザー指示を優先する。
- リモート履歴に含まれる `images/source/ai-placeholder/` は正式版の採用素材ではない。現在のページ・CSS・JavaScriptから参照せず、静的配信対象にも含めない。履歴を保つため削除や書き換えは行っていない。
