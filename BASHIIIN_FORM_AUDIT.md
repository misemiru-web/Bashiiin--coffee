# Bashiiin! coffee 問い合わせフォーム実装調査

調査日：2026-11-06（JST）
対象：現在の formal-production 作業フォルダ、作業環境から参照できる事業資料・QA記録。
方法：コード・設定・既存文書の読み取りとCloudflare公式文書の確認。フォーム送信、本番アクセス、負荷試験、テスト再実行はしていない。コード・設定・本番環境は変更していない。

## 判定の読み方

- **実装済み**：現在のローカルコードに処理がある。
- **記録上確認済み**：既存QA文書に過去の検証結果がある。現在のCloudflare設定を再確認した意味ではない。
- **未実装**：現在のコード・設定に存在しない。
- **未確認**：資料・本調査では根拠が得られていない。

## 1. 現在のシステム構成と処理の流れ

### 構成

- フロントエンドは静的HTML/CSS/JavaScript。**contact/index.html** のフォームが同一オリジンの POST /api/contact を呼ぶ。
- バックエンドは**Cloudflare Worker**。Pages Functionsや外部APIのフォーム処理ではない。**worker/index.mjs:1-12** が /api/contact を処理し、その他の許可済み静的ファイルはWorkers Static Assetsへ渡す。
- メールはCloudflare Email Serviceの send_email binding（EMAIL.send()）を使う実装。ボット判定はTurnstileのブラウザーWidgetとWorkerからのSiteverify API。
- 本番用ローカル設定 **wrangler.jsonc:3-21** は dist/ の許可リスト配信、APIのWorker優先、workers_dev/Preview無効、フォームとメールのフラグ "false"、Worker observability無効。正式Cloudflare本番環境・ドメイン・本番binding/Secretは未構築・未設定とREADMEおよび **docs/operations/cloudflare-launch-checklist.md:8-14** に記載。
- **wrangler.staging.jsonc:3-41** にはStaging用のEmail bindingとRate Limit bindingがあるが、送信フラグは "false"。設定中のメールアドレスは本報告に転記しない。Stagingの現在の稼働設定・Secretは照合していない。
- 2026-10-31/11-01のQA資料にはStaging、専用E2E、異常系Workerのsafe導入・Access保護・無効POSTの503が記録される。送信無効の確認であり、現在の環境状態を保証しない。

### 送信の流れ

1. ブラウザーで名前・メール・問い合わせ本文を入力し、Turnstileトークンを取得する。現在のHTMLはSite Keyが空、endpoint-readyがfalse、送信ボタンdisabledのため送信できない。
2. 有効化後のJavaScriptは値とトークンをJSONにし、POST /api/contactへ送る。同時に処理中フラグを立て二重クリックを抑える。
3. WorkerはPOST以外を拒否し、必要設定を確認。次にURL/Origin/Sec-Fetch-Siteを照合し、Rate Limit bindingを呼ぶ。
4. JSON本文・項目を検証し、Turnstile Siteverifyへトークンを送り、success・hostname・action=contactを照合する。
5. Workerは固定送信元・通知先と、入力されたメールをReply-Toにしたプレーンテキスト通知を作り、Email bindingへ1回送る。messageIdが返った場合だけAPIが200 ok:trueを返す。
6. ブラウザーは200とJSONのok:trueを受けた時だけ成功表示する。エラー・通信断では失敗表示、入力値を保持する。

根拠：**script.js:374-442**、**worker/contact/api.mjs:21-40**、**worker/contact/mail.mjs:3-19**、**contact/index.html:100-121**。

### From / To / Reply-To

- From：Worker環境設定の固定CONTACT_FROM。正式ドメイン確定後に認証済み送信ドメイン上で設定する設計。本番値は未設定。
- To：固定CONTACT_TO。要件上は店舗指定・検証済みアドレス。本番の店舗指定先は未確定。
- Reply-To：フォーム入力者のメールアドレス（サーバー側で形式検証）。入力値をFromやToに使わない。
- 自動返信、添付、CC/BCCは実装していない。

根拠：**worker/contact/mail.mjs:3-10**、**docs/requirements/requirements_v1.6_2026-10-13.md** §3.6/§7.5、**docs/operations/cloudflare-launch-checklist.md** §B。

## 2. セキュリティ・品質の評価

### 実装済みの保護

- 有効化には二つの厳密な "true" フラグ、Turnstile Secret、正規HTTPS origin、hostname、From/To、Email・Rate Limit bindingが必要。不足時は本文を読む前に503で拒否。
- Origin一致、任意のSec-Fetch-Siteがsame-originであることを要求。CORS許可ヘッダーはない。クロスオリジンPOSTを受ける設計ではない。
- フロント/Worker双方で入力検証。未知JSONキーを拒否し、本文は読み取り中も48KiB上限。名前100、メール254、本文5,000、トークン2,048文字。
- Turnstileのサーバー検証でsuccess、hostname、actionを照合。障害は失敗扱い。トークン単回使用・期限切れ判定はCloudflareへ委ねる。
- 個人情報・トークンをログ、URL、Analyticsに意図して出さず、ブラウザー永続ストレージへ保存しない。アプリDBやアプリ内メール保管はない。
- APIはメールサービスの受付messageIdを確認後に成功応答。エラーに入力値や内部例外を返さない。
- 現行本番設定は無効。ビルドもフォーム無効/noindexを必須にする。

### リスク・限界

- **実送信は未稼働**。ローカルmockや過去のStaging Siteverify成功は、本番Workerからの認証・配送を証明しない。
- **二重送信保証は限定的**。ブラウザー処理中の二重操作は抑えるが、冪等性キーやAPI側の重複排除はない。メール受付後の応答遅延・タイムアウト後に再送すると重複通知の可能性。フロントtimeoutは20秒、メールbinding待ちは5秒。
- **Rate Limitは全利用者で共有するキー** contact:submission。設定値は拠点ごとの概算で世界共通の厳密制限ではない。同地域の正当な利用者が巻き込まれる可能性がある。
- **配送監視は未整備**。APIはサービス受付を見て応答し、受信箱への到達を確認しない。Cloudflare Email Service Activity log/Analyticsで配送失敗等を確認できるが、自動アラート・担当者・頻度の設定根拠はない。Delivered表示も迷惑メールを含む受信箱到達を保証しない。
- **個人情報はメールボックスに残る**。アプリDBへは保存しないが、氏名・本文・メールは店舗指定メールボックスとメール配送サービスを通る。店舗側の閲覧権限・保管削除・担当交代ルールが必要。現行表示は利用目的のみで保管期間等は説明していない。
- Email Serviceのイベント分析は公式資料で31日保持。イベントには送受信者・件名・message ID等が含まれる。Email preview有効時はプレビューが約7日保持される場合がある。Worker observabilityは現設定で無効。Worker Logsを後で有効化する場合も個人情報を記録しない方針と期間が必要（公式料金資料ではFree 3日、Paid 7日。2026-12-01以降料金体系変更予定）。
- Email SendingはBeta表記。Cloudflare DNSが必要。新規アカウントの日次送信枠は保守的に始まり、アカウント状態で変わるため、導入前にアカウント固有条件を確認する。

根拠：**worker/contact/api.mjs:6-40**、**worker/contact/validation.mjs:1-53**、**worker/contact/turnstile.mjs:1-23**、**worker/contact/http.mjs:1-26**、**docs/operations/cloudflare-launch-checklist.md** §E/§F。

### エラーと保存の状態

- API応答：POST以外405、Origin不一致403、Rate Limit超過429、入力/Turnstile拒否400、本文超過413、Content-Type等415、設定不足や上流障害503。
- 自動再送・自動リトライなし。サーバーdeadline後に上流処理が完了する可能性があり、timeoutを未送信の証明にはできない。
- 問い合わせ本文をDB/KV/Durable Objectへ保存する実装なし。永続化は通知先メールボックス側。メール配送失敗の自動通知も未実装。
- CORSは未許可。APIは同一オリジンとOriginを必須とし、OPTIONSを受ける汎用CORS設計ではない。

## 3. 既存資料との整合性

| 優先資料 | 確認結果 | 整合性・未確認点 |
|---|---|---|
| Bashiiin!個別契約・顧客との確定合意 | 作業環境内に署名済み契約書や店舗指定先の最終記録は見つからない。要件書は2026-09-12の店舗メールで3項目フォームを許容、店舗指定先を公開前確定と記録。 | 3項目フォームの要件根拠はある。送信先、プライバシー説明、Cloudflare構成に関する個別合意の原本は確認できず、契約上確定とは断定できない。 |
| 事業設計書 v1.6（2026-11-04）§12/15/16 | 共通資料の正式版を確認。§12は公開前の実送信・店舗指定先到達QA、公開後支援を記載。§15は顧客名義Cloudflare Workers + Static Assetsを本案件の第一候補。§16は**信頼できる外部フォーム等を一般標準**、店舗指定先へ直接通知、保存するなら原則顧客名義、個人情報の最小化を記載。未成約問い合わせは最終連絡から1年を目安に整理・削除。 | Bashiiin要件v1.6はWorker＋Turnstile＋Email Serviceを本案件の第一候補とし、案件単位では整合。一方で一般標準（外部フォーム基本）と方式が異なる。案件固有例外を代表が承認した記録・契約は未確認。メール通知とDB非保存は整合するが、メールボックス側の保存・削除責任は未定義。 |
| 制作SOP v1.1 / QA | 2026-08-29版も外部フォーム基本、店舗指定先へ直接通知、個人情報の不要保存なし、公開前実送信を要求。2026-11-04改定影響メモでは制作・QA・公開SOP更新は未了。 | 現コードは案件固有Worker方式。実送信QA、障害時連絡、保守範囲を最新版SOPへ反映する必要がある。 |
| 3か年成長戦略 v1.3（2026-11-04） | 制作標準化と工数・顧客課題・保守負担の実案件検証を方針化。外部サービス価格等は導入時確認。 | テンプレート化は効率化候補だが、全案件にCloudflare方式を標準適用する合意や費用対効果の実績はない。 |

顧客名義アカウントは事業設計書の原則だが、本番Cloudflare所有者・権限・課金責任は未確認。事業設計書v1.6では代表が本番公開の最終判断者。店舗の全ページ最終承認、入金、公開準備、本番許可は未完了として扱い、noindexとフォーム無効を維持する。

参照資料：
- **docs/requirements/requirements_v1.6_2026-10-13.md** §0.3、§0.4、§3.6、§5.4、§7.5、§11.4、§14.3。
- **docs/operations/cloudflare-launch-checklist.md**。
- **/Users/ritsuki/GitHub/00_共通資料/01_事業設計/事業計画書/ミセミルWeb_事業設計書_v1.6_正式版_20261104.docx** §12/15/16。
- **/Users/ritsuki/GitHub/00_共通資料/01_事業設計/３ヵ年成長計画/ミセミルWeb_3か年成長戦略_v1.3_正式版_20261104.md**。
- **/Users/ritsuki/GitHub/00_共通資料/05_制作・保守運用/制作/ミセミルWeb_制作SOP_v1.1_v1.4準拠_20260829.md**。
- **ミセミルWeb_正式改定_変更履歴・関連資料への影響_20261104.md**（制作・QA・公開SOPは未更新との記載）。
- **docs/qa/staging-turnstile-siteverify-2026-10-31.md**、**docs/qa/contact-e2e-worker-initial-deployment-2026-10-31.md**、**docs/qa/contact-negative-worker-initial-deployment-2026-11-01.md**。

## 4. 問題点と優先順位

P0=直ちに止める重大問題、P1=公開・横展開前に決める、P2=品質・運用改善、P3=効率化候補。

| 優先 | 項目 | 状態・判断 |
|---|---|---|
| P0 | 直ちに修正が必要な脆弱性 | 本調査では確認されず。ただし本番API未稼働のため本番安全性を認定しない。 |
| P1 | 個別要件と一般標準の方式差 | 外部フォームを一般標準とする事業設計書に対し、Bashiiinは独自Worker。例外承認の根拠なし。代表判断が必要。 |
| P1 | 顧客名義・送信先・DNS・課金 | 未構築/未確認。本番アカウント所有者、最小権限、From、店舗指定To、検証済み宛先、DNS、Cloudflareプランを確定。 |
| P1 | 本番受入 | 実Worker Siteverify、Rate Limit、メール受付・到達、Reply-To、失敗系が未確認。店舗指定先への承認済み最小テストと代表承認が必要。 |
| P1 | 個人情報/障害の責任者 | 顧客メールボックス・Cloudflare側ログ等を通る。管理主体、閲覧者、削除、配送失敗の監視、障害連絡が未定義。 |
| P2 | 重複通知 | APIの冪等性なし。重複許容、結果不明時の利用者案内、担当者の確認方法を決定。保存による対策はDB非保存方針との承認が必要。 |
| P2 | 共有Rate Limit | 地域内の全利用者共通キーで誤制限のおそれ。店舗単位の厳密制限と説明しない。 |
| P2 | メール配送監視 | Activity log/Analyticsはあるが自動通知・定期確認担当なし。受付と到達を分ける運用を作る。 |
| P2 | プライバシー説明 | 現状は利用目的表示のみ。メール保管主体・保存期間・削除方針を照合。法令適合性は本監査で断定しない。 |
| P3 | 汎用化 | 件名・文言・項目名・API JSON・HTML/JS/Worker検証がBashiiin固定。設定差し替えだけでは別案件へ流用不可。 |

## 5. 共通化できる部分・案件別に分離する部分

**共通化候補**：本文サイズ制限、型/空欄/文字数/メール検証、エラー応答、Origin照合、設定不足時fail-closed、Turnstile検証、Rate Limit、タイムアウト、受付ID確認、個人情報をログ/解析に流さない設計、送信状態UX、環境作成・実送信・配送確認・公開承認のチェックリスト。

**店舗別に分離**：Cloudflareアカウント・Worker・origin/hostname、Turnstile widget/sitekey/secret、Rate Limit namespace/閾値、Email binding、DNS・送信ドメイン、From/To・Reply-To、件名・文面、項目・必須/任意・用途・上限、プライバシー説明、データ保管期間と責任者。

現在の実装をそのままコピーしてはならない。Bashiiin固有の件名・文面・API schema・3項目構成を含む。共有する場合、検証/配送の枠組みと案件別設定・入力定義・通知文を分離する。

## 6. 推奨する標準構成と比較

| 方式 | 良い点 | 負担・リスク | 評価 |
|---|---|---|---|
| 外部フォームサービス（事業設計書の一般標準） | 立上げが早く、配送や管理画面をサービス側に任せられる。独自バックエンドを減らす。 | 利用料金・顧客名義契約・データ移転・デザイン制約・サービス停止時を確認。保存サービスなら顧客名義原則。 | **簡易案件の既定候補**。事業設計書§16と整合。サービスごとの最新規約・料金確認が必要。 |
| 現行Workerを案件ごとに再利用 | 既存コード、Turnstile、Email Service、DB非保存、検証制御を活用。 | 顧客別Cloudflare・メール・DNS・権限・監視設定と実QAが必要。現状はBashiiin内容が固定。 | **顧客名義CloudflareにAPIを同居させる必要がある案件の例外候補**。ローカル実装の再利用可能性は高いが商用テンプレート実績は未確認。 |
| 共通コード＋店舗別バックエンド | 検証コードを共通化し、アカウント/Secret/データを分け、事故範囲と引継ぎを限定。 | 共通コード保守・脆弱性修正と顧客別環境QAが必要。 | **カスタムWorkerを複数案件で使う場合に推奨**。顧客アカウント上の独立Workerを基本にする。 |
| ミセミルWeb共通API | 一元更新・環境準備を減らす可能性。 | 顧客データ集中、テナント分離、アクセス/削除/契約責任、障害影響、顧客所有と引継ぎの不利。 | **現時点では非推奨**。現状では共通DB/APIを作る根拠がない。 |

**提案**：事業全体の既定は「信頼できる外部フォームを利用し、店舗指定先へ直接通知」。顧客名義CloudflareにAPIを同居させる必要がある案件や、外部サービスで必要要件を満たせない案件にWorker方式を限定する。代表決定後に検証・配送枠組みを共通化し、顧客別Worker・Secret/binding・送信先に分離する。個人情報を共通APIへ集めない。

これは技術提案であり、確定済み事業方針ではない。Bashiiin案件に外部サービスへの切替を指示するものでもない。契約・合意原本を確認後、代表判断を要する。

## 7. 入力項目、導入工数、運用費用

### 入力項目の拡張

項目追加では、HTML、JavaScript field/validation、Worker LIMITS・payload validator、メール文面、テスト、利用目的/プライバシー説明を同時に変更する。Workerは未知キーを拒否するためUIだけの追加では送信できない。電話・予約希望日・添付・機微情報・長期保存は別途要件判断。添付/自動返信は現APIにない。

### 工数概算（技術担当1名、待ち時間除外）

- 外部フォーム接続：選定・アカウント確認・設置・通知先・QAで**1〜3時間**。契約/規約・デザイン制約による追加あり。
- Worker方式の初回顧客設定：Cloudflare/Turnstile/Email/DNS/Rate Limit、文面/項目、QA/引継ぎで**4〜8時間**。
- 現行コードの汎用モジュール化と設定契約/手順/複数構成QAで**6〜12時間程度**。
- 次のWorker案件：顧客環境準備済みなら**2〜4時間**、新規DNS/権限/送信ドメイン含む場合**4〜8時間**。
- 1項目追加は**0.5〜2時間**目安＋文面・プライバシー・顧客確認。添付/保存/CRM連携は別途。

概算仮説で実績ではない。2〜3案件で計測し直す。

### 月額・サービス費用

- Workers Paidは公式料金で**アカウントあたりUS$5/月から**。Workers Freeは100,000 Worker requests/日。Email Serviceの任意宛先送信はPaidが必要。アカウント内の検証済み宛先への送信はFree/Paidとも無料と記載。個別条件を設定時確認。
- Paidには月1,000万Worker requestsと3,000万CPU-ms。超過課金あり。静的Assetsへのrequestは無料・無制限との公式説明。Paidは他Cloudflareプランとは別料金。
- Email Service Paidの任意宛先向け送信は月3,000通込み、以後US$0.35/1,000通。日次送信上限はアカウント状態で変動。Email SendingはBeta表記、Cloudflare DNSが前提。
- Turnstile Freeは1アカウント20 widget、検証回数無制限。
- ドメイン、外部フォームサービス、税/為替、アカウント固有の超過額は未確認。第三者費用は原則顧客実費。
- 運用は送信先変更、認証/設定、配送失敗、サービス仕様、DNS/ドメイン、障害連絡を扱う。監視担当・SLA・保守範囲は未設定。24時間365日対応を前提にしない。

公式確認日：2026-11-06。料金/仕様は導入前に再確認する。

## 8. 代表が判断・決定する事項

1. 外部フォーム基本かWorker方式を標準候補化するか。事業設計書§16とBashiiin個別要件の差を案件固有例外として認めるか。
2. Bashiiinの署名済み契約/顧客メール原本、方式・個人情報・送信先・顧客名義アカウントの合意。
3. 本番Cloudflare/ドメイン/Email/Turnstile/課金の所有者と管理者。制作権限は最小限。
4. 店舗指定・検証済みTo、認証済みFrom、Reply-To、通知担当/代理。
5. メール保管場所・閲覧者・保存期間・最終連絡後1年を目安とする削除責任、Cloudflareログ確認担当。
6. Rate Limit値と共有制限の受容。重複通知許容、結果不明時の案内。
7. 実送信試験件数/送信先/担当、障害時停止・連絡、公開後の保守範囲。
8. 店舗最終確認、支払条件、本番公開の最終許可。事業設計書上、代表が最終判断者。

## 9. 未確認事項・追加調査

- Bashiiin署名済み個別契約、最新顧客メール/合意原本、フォーム方式の承認。
- 本番Cloudflareアカウント名義、現行Worker/Email/Turnstile/Rate Limit、Secrets、Access/Preview/Routes、課金プラン。Secret値は調査・報告しない。
- 正式ドメイン/DNS、送信元認証、検証済み送信先、メール転送・迷惑メール処理。
- Staging/E2E/negativeの2026-11-06時点ライブ状態。QAは過去記録。
- メールボックス管理・保存削除・転送先・事故時連絡先、保守契約/障害担当。
- 実Worker Siteverify、Email受付から到達、実Rate Limit、Reply-To、配送失敗通知。
- 法令・個人情報保護への適合性。コード監査だけでは認定しない。
- 予約/医療/金融等、機微情報を扱う案件への適合性。事業設計書は通常LPとして安易に実装しない方針。

## 10. Cloudflare公式一次資料

2026-11-06に確認。

- [Workers料金・Free/Paid枠・ログ保持](https://developers.cloudflare.com/workers/platform/pricing/)
- [Workers上限](https://developers.cloudflare.com/workers/platform/limits/)
- [Email Service料金](https://developers.cloudflare.com/email-service/platform/pricing/)
- [Email Service送信制限・日次枠](https://developers.cloudflare.com/email-service/platform/limits/)
- [Email Service送信ドメイン設定・Cloudflare DNS条件](https://developers.cloudflare.com/email-service/get-started/send-emails/)
- [Email Service Activity logと配送状態](https://developers.cloudflare.com/email-service/observability/logs/)
- [Email Service Analyticsと31日保持](https://developers.cloudflare.com/email-service/observability/metrics-analytics/)
- [Email Service bounceイベント](https://developers.cloudflare.com/email-service/reference/event-subscriptions/)
- [Turnstile料金・プラン](https://developers.cloudflare.com/turnstile/plans/)
- [Rate Limit bindingの地域別仕様](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)

## 11. 調査作業記録

- 作業前にbranch formal-productionと既存の未コミット変更を確認。既存HTML/CSS、QA資料、画像等は変更していない。
- コード・設定・資料・公式ドキュメントのみ読み取り。本報告書以外は変更していない。
- npm build/test、フォーム送信、本番アクセス、負荷試験、Cloudflare Dashboard/API操作は未実施。
- commit、push、deploy、DNS変更、フォーム/API有効化、noindex変更、メール送信は未実施。
