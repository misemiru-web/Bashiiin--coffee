# Bashiiin! coffee

Bashiiin! coffeeのWebサイトを管理するリポジトリです。コードとGit設定から確認できる事実を記録し、業務状態や公開状態が未確認の項目は `要確認` としています。

## 1. 基本情報・現在の状態

- 案件名: Bashiiin! coffee
- 内容: 店舗情報を掲載する静的Webサイト
- 現在のHTML title: `Bashiiin! coffee | SPECIALTY COFFEE / KYOTO`
- robots設定: `noindex, nofollow, noarchive`
- 現在の制作・承認・公開・保守状態: 要確認
- 正式な公開URL: 要確認
- README最終更新日: 2026-10-08

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
- `image` 候補: `images/web/space/DSC_0167-1450.webp`（店内）、`images/web/hero/DSC_0052-1450.webp`（コーヒー）。正式素材フォルダ内の原本から生成し、SPACE / HEROで使用。`logo` 候補: HEADER / FOOTERで使用中の `images/web/logo-header.png`。本番で各URLから画像が取得できることも確認する。
- `index.html` のJSON-LDには `example.com` を残さない。提供原稿は改変せず保存しているため、原稿内には仮URL・未確認値が残る。原稿は公開アセットに含めないこと。GitHub Pages workflowはページと参照アセットだけを一時ディレクトリへコピーし、原稿・README・元写真を配信しない。本番Cloudflareでも同じ配信範囲を使い、リポジトリrootをそのままStatic Assetsにしない。
- 現在のrobots `noindex, nofollow, noarchive` は維持。ドメイン・画像URL追加と検索公開への切り替えは、公開工程で別途確認する。

## 14. 正式版の写真素材ルール

- 写真は原本が `images/formal ver/` に存在する店舗提供素材だけを使用する。HERO、全セクション、OGP、JSON-LDのimage、背景写真にも適用する。保存先だけで可否を判断せず、原本との対応を確認する。営業サンプル専用写真や出所不明の写真は使用しない。
- ロゴ・ブランドマーク・faviconのみ例外。現在は `images/web/logo-header.png`、`images/web/favicon.png` をPNGのまま使用する。
- 2026-10-08確認時点の更新後の原本は17枚。全原本の拡張子は `.webp` だが、実形式はJPEG。原本の削除・上書き・移動・renameはしない。
- 現在の表示用写真は実形式がWebP。最新のユーザー指示に従い `images/web/{hero,coffee,sweets,space,culture,journal}/` に生成。各写真400 / 800 / 原本幅の3サイズ、品質84、向きの正規化、EXIF除去のみで、拡大・色調変更・AI加工・内容の追加はしない。
- CURRENT BEANSは現在販売中の豆情報が未確認のため案内のみ。パッケージ写真はHEROに使用し、写真内のラベルから豆名・現在の在庫を推測しない。`beans/` と `common/` は採用素材が必要になった時点で作成する。
- 別写真を優先し、今回の割り当てではセクション間の同一写真の重複はなし。HEROのループ複製は読み上げ・focusから除外する。
- `srcset` / `sizes` は表示寸法とobject-fitによるトリミングを考慮。HERO先頭だけhigh priority、その他はlazy。原本以上の解像度は作らないため、高密度画面のCOFFEE / SPACEは原本解像度が上限となる。
- OGPは未確定。候補は `images/web/hero/DSC_0052-1450.webp`。写真の選定・本番絶対URL・OGP用比率の決定は公開工程で確認する。現時点でOGPを新規作成・設定していない。

更新後の全原本を内容確認した一覧（先頭11枚が追加素材）：

| 原本（images/formal ver/） | 内容 | 今回の用途 |
|---|---|---|
| `829940080_1786515612391095_3237499876071483915_n.webp` | ロゴ入りパッケージ | HERO 2 |
| `830324349_4550763371904964_7100813407432157579_n.webp` | 金属のスプーン・木のテーブル | JOURNAL 3 |
| `830416943_1686497192996545_8268471576687266553_n.webp` | グラスに盛られた層状スイーツ | 未使用。商品情報未確認 |
| `831183319_1430301269249591_8222574010323692921_n.webp` | イラスト入りTシャツ・レンガ壁 | 未使用。同じ写真の高解像度原本をCULTUREで使用 |
| `833135303_1893980718650582_7245257760060958267_n.webp` | グラスへコーヒーを注ぐ手元 | JOURNAL 1 |
| `833271010_1402944518670214_7334833199519804194_n.webp` | サーバー・グラス・カード・奥のプリン | 未使用。同じ写真の高解像度原本をHEROで使用 |
| `834720508_1439441991453605_1079492859231359163_n.webp` | 店内・カウンター・器具 | 未使用。同じ写真の高解像度原本をSPACEで使用 |
| `835355627_2191449308084144_6214797320265951783_n.webp` | ロゴと2階への案内がある入口看板 | HERO 3 |
| `835657091_2283790962443589_2894471994776161918_n.webp` | 氷入りドリンク・焼き菓子・カード | 未使用。同じ写真の高解像度原本をJOURNALで使用 |
| `836500267_1085156011078265_5022858138063918314_n.webp` | プリン・皿・スプーン | 未使用。同じ写真の高解像度原本をSWEETSで使用 |
| `836650886_1839293087060384_1504843703391329726_n.webp` | コーヒーを準備する手元・ドリッパー・サーバー・ポット | COFFEE |
| `DSC_0052.webp` | サーバー・グラス・カード・奥のプリン | HERO 1 |
| `DSC_0132.webp` | 氷入りドリンク・焼き菓子・カード | JOURNAL 2 |
| `DSC_0165.webp` | イラスト入りTシャツ・レンガ壁 | CULTURE |
| `DSC_0167.webp` | 店内・カウンター・器具 | SPACE |
| `R0000476.webp` | プリン・皿・スプーン | SWEETS |
| `R0002506.webp` | グラスに盛られた層状スイーツ | 未使用。商品情報未確認 |

## 15. 全体レビュー修正と配信範囲

- 独立ABOUTと未確認の店舗体験コピーは削除済み。LATEST INFOからCOFFEEへ直接続く。
- HEROの停止位置を保持するため、写真列1周＋表示領域分を満たすループ複製を確保。複製はaria-hidden / inert / 空altで読み上げ・focusから除外。写真配分の重複承認とは別の、同一ギャラリー内の処理。
- CURRENT BEANSは案内のみの間 `current-beans--pending` で余白を縮小。確認済みの豆・写真・更新時点を掲載する際は、このクラスを外して編集リストの寸法を再確認する。
- COFFEEの反復本文を削除。見出しと大判写真は維持。
- `.github/workflows/deploy-pages.yml` はHTMLのimg / srcset / faviconとCSSの画像参照を抽出し、index.html / styles.css / script.jsと実際の参照アセットだけを配信対象にする。入力資料、管理文書、元素材は含めない。公開先・main push起動は変更しない。実デプロイは未実施。
- 最新の写真配分・表示用WebPと原本の対応は§14 / §16を参照。写真監査完了は本番公開承認・送信基盤の完成を意味しない。
- 公開前: 店舗の豆情報・新作情報・Mapピン・最終承認、本番ドメインとSEO、Worker / Siteverify / メール送信、GA4 / Search Console、Cloudflare配信・HTTPS、実機と性能の確認が必要。送信無効とnoindexは維持する。


## 16. 写真の出所監査（2026-10-08・素材更新後）

- 現在の全表示写真は下記10原本から生成した30 WebP。分類B（正式原本由来の最適化版）が30ファイル、C（ブランド素材）が2ファイル。A（原本の直接使用）とD（不適合）は0件。
- 表中の `{400,800,最大幅}` はその各幅をファイル名に持つ3ファイルを示す。これが今回作成したWebPの全一覧。パスはすべて `images/` 配下。

| 使用箇所 | 表示用WebP（3サイズ） | 原本（formal ver/） |
|---|---|---|
| HERO | `web/hero/DSC_0052-{400,800,1450}.webp` | `DSC_0052.webp` |
| HERO | `web/hero/coffee-packages-{400,800,1206}.webp` | `829940080_1786515612391095_3237499876071483915_n.webp` |
| HERO | `web/hero/entrance-sign-{400,800,1206}.webp` | `835355627_2191449308084144_6214797320265951783_n.webp` |
| COFFEE | `web/coffee/coffee-preparation-{400,800,1206}.webp` | `836650886_1839293087060384_1504843703391329726_n.webp` |
| SWEETS | `web/sweets/R0000476-{400,800,1920}.webp` | `R0000476.webp` |
| SPACE | `web/space/DSC_0167-{400,800,1450}.webp` | `DSC_0167.webp` |
| CULTURE | `web/culture/DSC_0165-{400,800,1450}.webp` | `DSC_0165.webp` |
| JOURNAL | `web/journal/coffee-pouring-{400,800,1206}.webp` | `833135303_1893980718650582_7245257760060958267_n.webp` |
| JOURNAL | `web/journal/DSC_0132-{400,800,1450}.webp` | `DSC_0132.webp` |
| JOURNAL | `web/journal/spoon-{400,800,1206}.webp` | `830324349_4550763371904964_7100813407432157579_n.webp` |
| HEADER / FOOTER / favicon | `web/logo-header.png` / `web/favicon.png`（変換なし） | 正式ブランド素材 |

- HERO順序: DSC_0052（コーヒー）→ coffee-packages（パッケージ）→ entrance-sign（入口看板）。3枚を維持し、未確認の新作スイーツや他セクションの写真で点数を埋めない。
- JOURNAL順序: coffee-pouring（注ぐ手元）→ DSC_0132（ドリンク）→ spoon（器具のディテール）。静的／手動横スクロールを維持する。
- COFFEEはDSC_0052からcoffee-preparationへ変更。SWEETS / SPACE / CULTUREは既存の適切な原本を維持し、WebPへ変換するだけで構図・コピーを変更しない。
- セクション間の同一写真の重複は0件。17枚には同じ写真の別サイズ版が含まれるので、ファイル名が違うだけの同一カットを別写真として数えない。
- 旧 `formal ver/web/*.jpg`、`web/hero/*.jpg`、`web/culture/*.jpg`、`web/journal/*.jpg`、`web/space/*.jpg` および `web/` 直下の旧写真は現在のHTML / CSS / JavaScriptから参照なし。削除候補として保持し、今回は削除しない。旧HEROのcoffee-cup / entrance-door / brewing-stationは正式原本がないため再使用しない。
- 原本と未使用派生画像、提供JSON-LD原稿は静的配信対象へ含めない。既存workflowは参照ファイルを抽出するため、新しいWebPも参照に従って収集する。

生成に使用した原本のSHA-256（元ファイルが変更されていないことを確認する基準）：

| 原本 | SHA-256 |
|---|---|
| `DSC_0052.webp` | `07507bab2cd14abd241b538e6cbffd83bc4dedc9ba146a99c5c54d957eb0ad5a` |
| `829940080_1786515612391095_3237499876071483915_n.webp` | `fa4c53c02a01fa59bf34cdbc2792c2610f2742376b6920c2cb1bd038b804d45a` |
| `835355627_2191449308084144_6214797320265951783_n.webp` | `d298a50112f3fbed38d41a9e66539fe29a804c1ed8dd66a90175d79324d6fdc3` |
| `836650886_1839293087060384_1504843703391329726_n.webp` | `91de56aa925f761a15ae59af840f955ffebab98e7d0cd9a5904f30e4a31a0cca` |
| `R0000476.webp` | `b88bff4c7c22eb38e40f3a73ec7427df1affd95b0a173966757526525c6f912e` |
| `DSC_0167.webp` | `ecccbd75db17ad4ffd42d3ad75686fa775097bb8efdeeb11019137a4a71d70a6` |
| `DSC_0165.webp` | `400a7e2890118d2b60ca83caf3bcd6dce89af812a39564592db5a6caf1f27bb1` |
| `833135303_1893980718650582_7245257760060958267_n.webp` | `abdbddc69ac46e578ec637230ce2eba1aa8936aed8073cd9f312b83b9b9fa115` |
| `DSC_0132.webp` | `5a72bf5c5642d9bb8ef99ddc4f8657f37e535c1e19bbb0e7623d669ddd4319fa` |
| `830324349_4550763371904964_7100813407432157579_n.webp` | `ce0d341a89a895ad9a709a006fa0218eb3c503d12f21be095a9b09a432fdc2af` |

## 17. formal-productionの履歴統合

- リモートの既存3commitは履歴・追加資料を保持してmerge。競合したHTML / CSS / JavaScriptは、v1.5と最新の写真ルール・フォーム仕様に基づく検証済み実装を採用した。
- `docs/`、`design-qa.md` はリモートにあった過去の資料・検証記録として保持。v1.3資料や旧実装の画面は現在の受入基準ではなく、指定のv1.5資料と最新ユーザー指示を優先する。
- リモート履歴に含まれる `images/source/ai-placeholder/` は正式版の採用素材ではない。現在のページ・CSS・JavaScriptから参照せず、静的配信対象にも含めない。履歴を保つため削除や書き換えは行っていない。
