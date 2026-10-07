# Bashiiin! coffee LP 正式制作版 要件定義書

**Version 1.3 / 2026-09-13**  
**Document status: Production Requirements / Formal Build**  
**対象リポジトリ：`misemiru-web/Bashiiin--coffee`**  
**現行営業サンプル：`https://misemiru-web.github.io/Bashiiin--coffee/`**

> 正式版では「スペシャルティコーヒーを中心に、明るく、分かりやすく、Bashiiin! coffeeらしい個性が伝わること」を最優先とする。

---

## 0. 本書の目的・優先順位

### 0.1 目的

本書は、営業サンプルを正式サイトへ移行するための**実装・確認・受入の基準**を定義する。実装担当者、デザイナー、店舗確認者が、掲載内容・機能・技術・公開条件について同じ判断基準を持てる状態を作る。

### 0.2 基準資料と優先順位

情報が競合する場合は、次の順に優先する。

1. 店舗担当者・大熊佑典様からの最新の明示回答（メール、ヒアリングシート等）
2. 契約書・見積書で合意した制作範囲
3. ミセミルWeb 事業設計書 v1.4
4. 本書 v1.3
5. 旧要件定義書 v0.4
6. 現行営業サンプルの実装

**視覚デザインの判断について**：正式版は、先方が営業サンプルLPを確認したうえで契約に進んでいることを踏まえ、現行営業サンプルのデザインDNAを継承する。見た目・構図・写真の使い方は、最新の「デザイン定義書 v1.3」および作成済みデザインリファレンスを視覚基準として参照する。ただし、掲載内容・機能・契約範囲・店舗の最新回答と競合する場合は、本書および上位資料を優先する。

旧v0.4にある「店舗確認前」「CONCEPT PREVIEW」「一人客中心」「暗色の隠れ家」「ACCESSセクション」等は、今回の正式回答と競合するため、正式版では本書を優先する。

### 0.3 今回の確定条件

| 項目 | 正式制作条件 |
|---|---|
| 制作物 | 京都店舗 1ページLP |
| プラン | 実績形成キャンペーン 29,800円 |
| 制作中修正 | 2回 |
| メニューページ | 設けない |
| 保守 | 公開後に検討（任意） |
| 主目的 | 来店促進、初回来店情報の整理、ブランド・コーヒーの魅力訴求 |
| 最優先訴求 | スペシャルティコーヒー |
| 価格 | 基本掲載しない |
| 営業時間 | 固定掲載せず、Instagram等で最新情報を確認 |
| ACCESSセクション | 設けない |
| 店舗住所 | フッター等の最低限の店舗情報として掲載 |
| 問い合わせ | 簡易問い合わせフォームを設置 |
| フォーム項目 | お名前／メールアドレス／お問い合わせ内容 |
| フォーム送信先 | 店舗指定メールアドレス。公開前に確定 |
| 写真・ロゴ | 現行サンプル素材を原則使用。差し替えは店舗希望時のみ |
| AI生成画像 | 本番サイトでは使用しない |
| 新作スイーツ | 10月新作。商品情報・写真受領後にSWEETSへ追加 |
| 独自ドメイン | 未定／相談して決定 |
| GA4 | 導入する。測定IDは公開前に確定 |
| 正式ホスティング | 顧客名義 Cloudflare Workers + Static Assets を第一候補 |
| 正式制作branch | `formal-production` を使用し、`main` へ直接実装しない |
| フォーム実装 | Cloudflare Worker `/api/contact` + Turnstile + Email Service を第一候補 |

---

## 1. サイトの目的・成功状態

### 1.1 第一目的

**Bashiiin! coffeeがスペシャルティコーヒーを大切にしている店であることを明確に伝え、来店検討につなげる。**

### 1.2 第二目的

Instagramに分散している「営業情報、豆、スイーツ、店内、カルチャー」を1ページに整理し、初めて知った人が短時間で店舗像を理解できるようにする。

### 1.3 第三目的

店舗の個性を、過度な「高級」「隠れ家」「暗いバー」表現に頼らず、**明るさ・清潔感・クラフト感・カルチャー**として表現する。同時に、先方が評価した営業サンプルLPのロゴ、実店舗写真、大きな明朝系見出し、英字Eyebrow、エディトリアルな余白、写真と文字の強いコントラストといったブランドの連続性を維持する。

### 1.4 主要行動

優先順は以下とする。

1. スペシャルティコーヒー・現在の豆・スイーツ等を見る
2. Instagramで最新の営業情報を確認する
3. Instagramで店舗の最新投稿を見る
4. 必要に応じてGoogle Mapsを開く
5. 問い合わせフォームから問い合わせる

Google Mapsへの導線は残してよいが、**独立したACCESSセクションは設けない**。必要な位置情報はヘッダー／HERO／フッター等の補助導線として扱う。

---

## 2. ターゲット・コミュニケーション方針

### 2.1 ターゲット

店舗回答は「特に限定なし」。よって、旧v0.4の「一人客を最優先」といったペルソナ固定は行わない。

想定閲覧者は、Instagram、Google検索、Google Maps、口コミ、知人紹介等をきっかけにBashiiin! coffeeを知り、次の情報を確かめたい人とする。

- どのようなコーヒーを扱っているか
- 現在どのような豆があるか
- スイーツや店内の雰囲気
- 店のカルチャーや活動
- 最新の営業情報
- 問い合わせ方法

### 2.2 伝えたい中心メッセージ

**「スペシャルティコーヒーを中心に、コーヒー・スイーツ・空間・カルチャーを楽しめるBashiiin! coffee。」**

具体的コピーはデザイン・実装段階で整理し、店舗が明示していない製法・評価・人気・客層を事実として追加しない。

### 2.3 使用しない方向性

- 「隠れ家的」「隠れ家カフェ」等の表現
- 夜・バーを中心に見せる印象
- 暗さをブランド価値の中心にする表現
- 「一人で過ごす店」と客層を限定する表現
- 根拠のない「人気」「名物」「一番」「最高」等
- 店舗確認のない「自家焙煎」「自家製」「手作り」等

---

## 3. 正式版の情報設計

正式版は以下を基本構成とする。

1. HEADER
2. HERO
3. LATEST INFO
4. COFFEE
5. CURRENT BEANS
6. SWEETS
7. SPACE
8. CULTURE
9. INSTAGRAM / JOURNAL
10. CONTACT
11. FOOTER

**独立したABOUT、ACCESSは原則設けない。** 店舗紹介の短い説明はHEROまたはCOFFEE前後へ統合する。店舗住所・Google Mapsはフッター等へ最低限配置する。

### 3.1 HEADER

- Bashiiin! coffeeロゴ
- ページ内ナビゲーション：COFFEE / BEANS / SWEETS / SPACE / CULTURE / CONTACT
- 最新営業情報へのInstagramリンク
- モバイルはハンバーガーメニュー
- 正式公開時は `CONCEPT PREVIEW` 表示を削除

### 3.2 HERO

**目的：3秒以内に「スペシャルティコーヒーの店」「Bashiiin! coffeeらしい」「明るく入りやすい」を伝える。**

必須要素：

- Bashiiin! coffeeロゴまたは店名
- `SPECIALTY COFFEE / KYOTO` 等の短い英字補助
- スペシャルティコーヒーを中心にした短い日本語コピー
- 実店舗・コーヒー・抽出等の許可済み実写
- Primary CTA：最新の営業情報を見る（Instagram）
- Secondary CTA：サイトを見る行動を阻害しない範囲でInstagramまたはGoogle Maps

「隠れ家」「雑居ビルの奥」「一人でふらりと」等の旧コピーは使用しない。

**デザイン継承方針**：営業サンプルの「強い実店舗写真 × 大きな明朝系見出し × 英字Eyebrow × ロゴの存在感」という構成原理は残し、正式版では白・生成りの情報面を増やして明るく再編集する。全面黒背景や強い黒オーバーレイへ戻すのではなく、写真の存在感を保ちながら、正式版として可読性・余白・操作性を改善する。

### 3.3 LATEST INFO

- 営業日・営業時間は変動するため固定表を載せない
- 公式Instagramで最新情報を確認することを簡潔に案内
- 営業カレンダーを静的に模倣しない
- 「営業中／休業中」の自動判定は今回実装しない

### 3.4 COFFEE

**ページ内の最重要セクション。**

- スペシャルティコーヒーを明確に主役として扱う
- 抽出・豆・コーヒーの実写を大きく扱う
- 店舗が正式に確認していない焙煎方法・製法は断定しない
- 商品価格は基本掲載しない
- 必要な説明は短く、写真・見出し・余白で強弱を作る

### 3.5 CURRENT BEANS

- 現在扱っている豆を独立セクションとして掲載
- 公開時の最新内容を店舗確認して反映
- 必要に応じ、国／地域／品種／精製／フレーバー等をカードまたは一覧で表示
- 不明項目は無理に埋めない
- 更新頻度が高いため、将来CMS化できる構造を意識するが、今回CMSは実装しない
- 公開時点のスナップショットとして扱い、セクション内に「最終更新日」または同等の更新時点を表示できる構造にする
- 最新性が担保できない期間は「最新の提供状況はInstagramをご確認ください」等の補助導線を併記し、古い情報を最新情報のように見せない

### 3.6 SWEETS

- プリンだけに限定せず「SWEETS」として構成
- 現行の許可済み写真を使用
- 10月の新作スイーツは、商品名・説明・写真等を受領後に追加
- 情報未確定の段階でダミー商品を表示しない
- 価格は基本掲載しない

### 3.7 SPACE

- 店内・カウンター・雰囲気を実写中心で紹介
- 「静か」「会話しやすい」「長居できる」等の体験を保証する表現は避ける
- 明るい正式デザインに合わせ、暗い写真も過度な黒オーバーレイで沈めない

### 3.8 CULTURE

- グッズ、イベント、カッピング、コラボ等を掲載可能
- 「MORE THAN COFFEE」のような方向は使えるが、具体情報は確認済みのもののみ
- ページ内で最も遊び心を出してよいセクション
- ただし全体の読みやすさ・統一感を壊さない

### 3.9 INSTAGRAM / JOURNAL

- `@bashiiin_coffee` への明確な導線
- 営業情報・豆・スイーツ・イベント等の最新情報の確認先として機能
- APIによる自動取得は今回必須としない
- 許可済み写真を用いた編集レイアウトでよい

### 3.10 CONTACT

今回追加する簡易問い合わせフォーム。

**必須項目**：

- お名前（required）
- メールアドレス（required / email validation）
- お問い合わせ内容（required）
- 送信ボタン
- 送信成功・失敗メッセージ

**仕様**：

- フロントエンドは同一サイト内の `/api/contact` へ `POST` 送信する
- バックエンドは Cloudflare Worker で実装し、フォーム送信処理と静的サイトを同一Cloudflare Workersプロジェクト内で管理する
- Cloudflare Turnstileを導入し、**サーバー側でSiteverify APIによるトークン検証を必須**とする。クライアント側ウィジェットだけで判定しない
- 必須項目・メール形式・文字数上限等をクライアント側とサーバー側の両方で検証する
- 正常な送信のみ、Cloudflare Email Serviceの`send_email` bindingを用いて、店舗指定の**検証済み送信先メールアドレス**へ通知する方式を第一候補とする
- 送信元アドレスは店舗の正式ドメイン確定後、Cloudflare Email Serviceにオンボードしたドメイン上のアドレスを使用する
- 店舗指定メールアドレスは公開前に確定・検証する
- 問い合わせデータをDB等へ恒常保存しない。Workerログ・Analyticsにも本文、氏名、メールアドレス等の個人情報を意図的に出力しない
- フォーム付近に「入力情報はお問い合わせへの回答のために利用します」等の利用目的を明示する
- 送信成功・送信失敗・通信中の状態を明確に表示する
- 電話番号、住所、ファイル添付、会員登録、予約機能は今回の範囲外
- 自動返信は今回は実装しない。将来追加する場合は店舗と別途確認する
- Cloudflare Email Serviceの正式利用条件が案件時点で合わない場合のみ、店舗と合意のうえ信頼できる外部フォーム／メール送信サービスへ切り替える

### 3.11 FOOTER

最低限、以下を掲載する。

- Bashiiin! coffee
- 店舗住所：京都府京都市下京区市之町239-1 やながわビル2F
- Instagram
- 必要に応じGoogle Maps外部リンク
- Copyright

ACCESSセクションの代替として、住所を大きく訴求する必要はない。

---

## 4. 画像・素材

### 4.1 使用方針

- 現行サンプルLPで使用している写真・ロゴを、店舗了承済み素材として原則継続使用
- 差し替え・追加希望がある場合のみ追加受領
- Instagram写真の使用許可は店舗確認済みの認識で進める
- 人物写真は、本番では原則使用しない。必要時は個別許可を確認

### 4.2 AI生成画像

**本番サイトでは使用しない。**

営業サンプルでAI生成素材が残っている場合は、正式公開までに実写・正式素材へ置換、または当該表示を削除する。

### 4.3 画像処理

- Web用にリサイズ・圧縮
- 原本は上書きしない
- 適切なaltを付与
- width/heightを指定しCLSを抑制
- HEROのLCP画像は優先読み込み
- それ以外は原則lazy loading
- 公開不要なEXIF位置情報等を削除

---

## 5. 構造化データ（JSON-LD）

店舗から提供されたJSON-LDを**正式実装の入力資料**として扱い、トップページの`<head>`内へ`application/ld+json`で設置する。

### 5.1 実装要求

- `@type`: `CafeOrCoffeeShop` を基本とする
- `@id`、`url`、`image`、`logo`は正式ドメイン・実ファイルURLへ差し替える
- メニューページは設けないため、`menu`プロパティは削除
- 店舗情報ページは今回独立ページを設けないため、トップページのみでよい

### 5.2 公開前に必ず再確認する項目

提供JSON-LDに含まれる以下の値は、**提供されたからという理由だけで無検証に公開しない**。

- `alternateName`
- `description` 内の「自家焙煎」「自家製プリンが人気」等
- `priceRange`
- `geo`
- `hasMap`
- `openingHoursSpecification`
- `servesCuisine`
- `acceptsReservations`

特にヒアリングでは営業時間は変動しInstagram等で案内すると確認されているため、**固定の`openingHoursSpecification`は公開前確認なしでは掲載しない。** 正式な曜日・時間を固定できない場合は当該プロパティを削除する。

### 5.3 住所

ヒアリングで確認した住所表記を優先する。

`京都府京都市下京区市之町239-1 やながわビル2F`

郵便番号・表記揺れ・位置情報等は公開前に店舗提供情報と照合する。

---

## 6. SEO・検索公開

正式公開時に以下を整備する。

- `<title>`
- meta description
- canonical
- favicon
- OGP
- semantic HTML / 見出し階層
- alt
- sitemap.xml
- robots.txt
- LocalBusiness / CafeOrCoffeeShop JSON-LD
- HTTPS
- 正規URLの統一

確認用環境では`noindex`を維持し、**店舗の最終公開承認＋残金入金＋本番ドメイン確定後に検索公開へ切り替える**。

検索順位・インデックス登録・来店数は保証しない。

---

## 7. 技術・リポジトリ・公開環境

### 7.1 現行実装

現行リポジトリは静的構成である。

- `index.html`
- `styles.css`
- `script.js`
- `images/`
- GitHub Pages workflow

専用ビルド工程はない。正式版も、要件を満たせる限り**HTML/CSS/JavaScriptの静的構成を継続**する。不要なフレームワーク移行は行わない。

### 7.2 リポジトリ／branch運用

- リポジトリ：`misemiru-web/Bashiiin--coffee`
- 現行営業サンプルの基準branch：`main`
- 正式制作は `main` から `formal-production` branchを作成し、**正式制作中は `main` へ直接実装しない**
- `formal-production` 上でHTML/CSS/JavaScript、Workers設定、フォーム、GA4、SEO等を更新する
- 制作中の確認はローカル環境またはCloudflareの確認用Workers環境を使用し、現行GitHub Pagesの営業サンプルを不用意に更新しない
- クライアント最終承認・残金入金・正式公開準備完了後に、営業サンプル保存用のtagまたはbranchを残したうえで正式コードを`main`へ統合する
- 正式公開切替時はGitHub Pagesを停止するか、営業サンプル専用として検索対象外・正式サイトと非競合の状態にする
- READMEは正式公開環境、デプロイ方法、未公開の秘密情報を含めない運用ルールへ更新する
- APIキー、Turnstile secret、認証情報等はGitHubへ保存しない

### 7.3 GitHub Pages

現行GitHub Pagesは営業サンプル／確認用途として扱う。**正式商用サイトの標準公開先にはしない。**

正式公開後は、重複コンテンツを避けるため営業サンプルの公開停止、または検索対象外維持等を実施する。

### 7.4 正式ホスティング・ドメイン

- 独自ドメイン：店舗と相談し決定
- ドメイン・ホスティング：原則店舗名義
- 正式公開の第一候補：**顧客名義 Cloudflare Workers + Static Assets**
- 現行の静的HTML/CSS/JavaScriptをStatic Assetsとして配信し、問い合わせAPIのみWorkerロジックで処理する
- 静的アセットとWorkerを1つのデプロイ単位として管理する
- 確認環境は顧客名義Cloudflareアカウント上の`*.workers.dev`等を利用可能。正式ドメイン確定前でも確認URLとして使用できる
- DNS、HTTPS、www/apex正規化、canonicalを本番ドメインで確認する
- Cloudflareアカウントは店舗を管理主体とし、ミセミルWebには必要最小限の権限を付与する
- パスワード共有は行わない

### 7.5 問い合わせフォーム・メール送信基盤

- API endpoint：`POST /api/contact`
- 実行基盤：Cloudflare Worker
- bot対策：Cloudflare Turnstile。WorkerからSiteverify APIへ検証し、失敗時は送信しない
- メール通知：Cloudflare Email Service `send_email` bindingを第一候補とする
- 送信先：店舗指定の検証済みメールアドレス。公開前に確定
- 送信元：正式ドメイン確定後、Email Serviceへオンボードしたドメイン上のアドレスを使用
- 保存：DBへ保存しない。個人情報をconsole、GA4、URL、エラーメッセージへ含めない
- 成功条件：Turnstile検証、入力検証、メール送信処理が正常完了した場合のみ成功レスポンスを返す
- GA4 `generate_lead` はフロントエンドが成功レスポンスを受け取った後に1回だけ送信する

### 7.6 Google Analytics 4（GA4）

GA4は**正式導入する**。本番公開前にGA4プロパティ／Webデータストリームを準備し、測定ID（`G-...`）を確定する。

**実装方針**：

- Googleタグを正式サイトの`<head>`内へ設置する
- Googleタグは重複設置しない
- 営業サンプル／確認用GitHub Pagesには本番データを混在させない。原則として本番GA4データストリームへの送信対象外とする
- 拡張計測機能を有効化し、`page_view`、`scroll`、離脱クリック`click`、フォーム操作`form_start`／`form_submit`を計測対象とする
- Instagram、Google Maps等の外部リンクは、拡張計測の離脱クリックを基本に利用し、同一操作を重複計測しない
- 問い合わせフォームが**正常に送信完了した時点**で、GA4推奨イベント`generate_lead`を送信し、キーイベントとして利用する
- `form_submit`はフォーム送信操作の把握、`generate_lead`は実際の送信成功の把握として区別する
- 氏名、メールアドレス、お問い合わせ本文その他の個人情報をGA4のイベント名・イベントパラメータ・URL等へ送信しない
- 現行`script.js`の独自`bashiiin:analytics`／`dataLayer`処理は、本番GA4と重複しないよう整理し、不要なら削除する
- GA4の管理主体は原則として店舗側とし、ミセミルWebには設定・確認に必要な権限を付与する

**公開前確認**：

- Google Tag Assistant等でGoogleタグの設置を確認
- GA4のDebugView／リアルタイムで受信を確認
- Instagram／Google Mapsの離脱クリックを確認
- 問い合わせフォームの`form_start`／`form_submit`を確認
- 正常送信時のみ`generate_lead`が1回記録されることを確認

主な確認指標は、ページ閲覧、スクロール、Instagram／Google Mapsへの遷移、フォーム開始・送信、問い合わせ完了とする。売上・来店数との因果関係はGA4単独では保証・断定しない。

---

## 8. UI・アクセシビリティ

詳細な見た目は別紙「デザイン定義書 v1.3」を正とする。作成済みデザインリファレンスは、同定義書を具体化した視覚参考として用いる。要件定義書とデザインリファレンスが競合する場合は本書を優先する。

必須基準：

- Mobile First
- 360 / 390 / 430 / 768 / 1024 / 1440pxで破綻しない
- 横スクロールなし
- 本文16px相当以上を基本
- 主要操作領域44px以上をプロジェクト基準とする
- キーボード操作可能
- 視認できるfocus state
- 色だけで意味を伝えない
- テキストの背景に対するコントラスト4.5:1以上を基本とする
- 非テキストUIのコントラスト3:1以上を基本とする
- `prefers-reduced-motion`対応
- 適切なheading hierarchy / landmark / alt

---

## 9. モーション

- 控えめなFade / Reveal / Image Reveal程度
- 重要情報の理解を遅らせない
- 常時動く背景や強い3Dは使用しない
- `prefers-reduced-motion`では動きを抑制
- 初回表示時にロゴ演出を入れる場合も短時間・一度のみ

---

## 10. パフォーマンス

公開後の実ユーザーデータにおける目標：

- LCP 2.5秒以下を目安
- INP 200ms以下を目安
- CLS 0.1以下を目安

これらはCore Web Vitalsの**公開後の実測目標**として扱う。公開前QAではLighthouse / PageSpeed Insights等で重大な性能問題がないことを確認し、INPは実ユーザー操作が必要なためラボ環境ではTBT等も補助指標として確認する。

方針：

- 画像最適化
- HERO画像の優先読み込み
- below-the-fold画像のlazy load
- JS最小化
- 不要な外部ライブラリを増やさない
- Googleタグは公式手順に従い非同期で読み込み、主要表示を不必要にブロックしない
- 外部フォントは必須にしない

---

## 11. QA・受入条件

### 11.1 コンテンツ

- [ ] スペシャルティコーヒーが最重要訴求になっている
- [ ] 「隠れ家的」表現がない
- [ ] 一人客に限定する表現がない
- [ ] 価格を基本掲載していない
- [ ] 営業時間を固定情報として誤表示していない
- [ ] ACCESSセクションがない
- [ ] 住所はフッター等に最低限掲載されている
- [ ] 10月新作スイーツは、正式情報受領後のみ掲載

### 11.2 素材

- [ ] 本番にAI生成画像を使用していない
- [ ] 使用画像が店舗許可済み
- [ ] 人物写真を無断掲載していない
- [ ] altが適切
- [ ] 画像圧縮・寸法指定済み

### 11.3 フォーム

- [ ] お名前・メール・本文の3項目
- [ ] 必須入力チェック
- [ ] email形式チェック
- [ ] 店舗指定メールへテスト送信成功
- [ ] 成功・失敗メッセージが分かりやすい
- [ ] Turnstileが表示・動作し、Worker側Siteverify検証が成功時のみ送信される
- [ ] Turnstile未検証・期限切れ・再利用tokenで送信されない
- [ ] 店舗指定の検証済みメールアドレスへEmail Service経由でテスト送信成功
- [ ] 利用目的の短い説明文がフォーム付近に表示されている
- [ ] ミセミルWeb側に不要な個人情報を恒常保存しない
- [ ] console / Workerログ / GA4 / URLへ個人情報を出力していない

### 11.4 JSON-LD / SEO

- [ ] JSON-LDをhead内へ設置
- [ ] `example.com`が残っていない
- [ ] `menu`が削除されている
- [ ] 固定営業時間が未確認のまま入っていない
- [ ] description / priceRange / self-roast等の未確認情報がない
- [ ] 本番URL・画像URL・ロゴURLが正しい
- [ ] canonical / sitemap / robots / OGP確認済み

### 11.5 GA4

- [ ] 本番用GA4測定IDが確定している
- [ ] Googleタグの重複設置がない
- [ ] 営業サンプル／確認環境のアクセスが本番GA4へ混在しない
- [ ] `page_view`／`scroll`／離脱クリックが確認できる
- [ ] フォームの`form_start`／`form_submit`が確認できる
- [ ] 正常送信時のみ`generate_lead`が1回記録される
- [ ] 氏名・メールアドレス・問い合わせ本文等の個人情報をGA4へ送信していない
- [ ] DebugView／リアルタイムまたはTag Assistantで本番タグを検証済み

### 11.6 表示・操作

- [ ] 360 / 390 / 430 / 768 / 1024 / 1440px確認
- [ ] iOS Safari / Android Chrome / Desktop主要ブラウザ確認
- [ ] 横スクロールなし
- [ ] フォーカス操作可能
- [ ] reduced-motion対応
- [ ] 外部リンク正常

### 11.7 公開

- [ ] 店舗から「この内容で公開OK」の文章承認
- [ ] 残金14,900円入金確認
- [ ] 独自ドメイン・Cloudflareアカウントの所有者／管理主体確認
- [ ] Cloudflare Workers + Static Assetsの本番デプロイ確認
- [ ] GitHub Pagesが正式サイトと競合しない状態になっている
- [ ] HTTPS確認
- [ ] 安定版commit/tag作成
- [ ] README更新
- [ ] 公開直後に本番URL再確認

---

## 12. 実装時の変更差分（v0.4 → v1.3）

| 項目 | v0.4 | 正式版 v1.3 |
|---|---|---|
| ステータス | Concept Preview | Formal Production |
| デザイン | 暗色・静かな隠れ家 | 営業サンプルのデザインDNAを継承し、白・生成り主体で明るく洗練 |
| ターゲット | 一人客中心の仮説 | 特に限定なし |
| 主訴求 | コーヒー＋プリン＋一人時間 | スペシャルティコーヒー最優先 |
| ABOUT | 一人時間訴求 | 独立セクション原則削除 |
| CURRENT BEANS | なし／弱い | 独立セクション |
| PUDDING | 独立 | SWEETSに統合 |
| ACCESS | 独立セクション | 削除。住所・Mapは補助導線のみ |
| CONTACT | なし | Worker API + Turnstile + Email Serviceによる簡易フォーム |
| AI画像 | 条件付き可 | 本番使用不可 |
| 価格 | 未確認 | 基本掲載しない |
| ホスト | GitHub Pages | 顧客名義Cloudflare Workers + Static Assets第一候補 |
| JSON-LD | 将来候補 | 正式要件として実装 |
| noindex | 常時 | 確認中のみ、本番公開で解除 |
| GA4 | 未導入／独自イベントのみ | 正式導入。拡張計測＋問い合わせ成功`generate_lead` |

---

## 13. 未確定・公開前確認事項

- 独自ドメイン
- 問い合わせフォーム送信先メールアドレス
- CURRENT BEANSの公開時点最新情報
- 10月新作スイーツの名称・写真・説明
- JSON-LDの固定営業時間を削除するか、公開時に正式営業時間を設定できるか
- JSON-LDの`alternateName`、`priceRange`、`acceptsReservations`等の最終値
- OGP画像
- GA4の測定ID（公開前に確定）
- Search Consoleの最終設定・所有者確認

未確定事項は推測で埋めず、公開前に店舗確認する。

---

## 14. Decision Gate（確定タイミング）

### 14.1 完成イメージ・デザインリファレンス

**方針確定済み。** 作成済みデザインリファレンスを、デザイン定義書 v1.3 の具体的な視覚参考として利用する。

- 正式版は「別物への刷新」ではなく、営業サンプルLPを明るく洗練した進化版とする
- 主背景は白・生成りとし、濃色は写真・SPACE等の限定セクション・局所アクセントで使用する
- メインUIアクセントは Burnt Orange 系を基本とし、多色UIにしない
- HERO／COFFEE／CURRENT BEANS／SWEETS／SPACE／CULTUREは、同じ左右2カラムを繰り返さず、それぞれ役割に応じて構図を変える
- 使用写真は実店舗・実商品の許可済み素材を基準とし、必要な明るさ・色調補正を行ったうえで正式版へ反映する
- HERO H1および主要見出しはデザイン定義書 v1.3 のコピー方針を基準に最終調整する

### 14.2 フォーム実装前

- Cloudflare Workersプロジェクトを作成する店舗側アカウント
- Turnstile widget作成・secret管理方法
- Email Serviceの送信元ドメインと店舗の検証済み送信先

### 14.3 確認URL送付前

- CURRENT BEANSの最新情報と更新時点
- 10月新作スイーツ（受領済みの場合のみ）
- GA4確認環境で本番データを混在させない設定

### 14.4 本番公開前

- 独自ドメイン
- フォーム送信先・送信元
- JSON-LD最終値
- OGP画像
- GA4測定ID
- Search Console所有者
- GitHub Pages停止／非競合化

---

## 15. 参考資料

- ミセミルWeb 事業設計書 v1.4
- 制作前ヒアリングシート Bashiiin! coffee（2026-09-09回答版）
- Bashiiin! coffee LP 要件定義書 v0.4
- 店舗提供 JSON-LD
- 現行GitHubリポジトリ `misemiru-web/Bashiiin--coffee`
- 別紙：Bashiiin! coffee デザイン定義書 v1.3

### 技術・公開に関する一次情報

- Google Search Central：Core Web Vitals（LCP / INP / CLSの推奨目標）  
  https://developers.google.com/search/docs/appearance/core-web-vitals?hl=ja
- GitHub Docs：GitHub Pages limits / Additional Products and Features  
  https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits  
  https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features
- Cloudflare Workers：Static Assets / Get Started / Best Practices  
  https://developers.cloudflare.com/workers/static-assets/  
  https://developers.cloudflare.com/workers/static-assets/get-started/  
  https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- Cloudflare Turnstile：server-side validation  
  https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Cloudflare Email Service：send bindings / verified destination addresses  
  https://developers.cloudflare.com/email-service/configuration/send-bindings/  
  https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/
- Google Search Central：LocalBusiness structured data  
  https://developers.google.com/search/docs/appearance/structured-data/local-business
- Google Analytics：Googleタグの設定／測定ID  
  https://support.google.com/analytics/answer/15756615?hl=ja  
  https://support.google.com/analytics/answer/12270356?hl=ja
- Google Analytics：拡張計測機能イベント  
  https://support.google.com/analytics/answer/9216061?hl=ja
- Google Analytics：推奨イベント（`generate_lead`）  
  https://support.google.com/analytics/answer/9267735?hl=ja

以上。
