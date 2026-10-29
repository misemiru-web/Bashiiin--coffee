# Cloudflare導入・公開前チェックリスト

更新：2026-10-29 / STEP 09-C2-A

この文書は今後の作業手順です。チェック済みでない項目は承認・設定完了を意味しません。アカウントID、実ドメイン、送信元・宛先アドレス、Secret・トークンの値は記載しません。値は権限を持つ管理者が対象環境で扱い、ここには確認日・担当・結果だけを記録します。

## 現在の確認済み状態

- 正式5ページ、限定ビルド、CONTACT API・入力検証・Siteverify・メール通知モジュールはローカル実装済みです。
- STEP 09-A／09-Bの検証では計109自動テスト・72項目のローカルWrangler HTTP検証が通過済み。今回の資料整備では `npm run verify:dist` が通過し、既存出力39ファイルの一致を確認しました。build・自動テスト・HTTP検証は再実行していません。
- 公開許可リストは `scripts/public-files.json` の39ファイル（5 HTML、CSS/JS、WebP 30件、ブランド素材2件）。Static Assetsは `dist/` のみです。
- Cloudflare実環境は未構築・未デプロイ。アカウント・プラン・正式ドメイン・DNS・送信元／宛先・権限は未確認です。
- APIフラグ2つは文字列 `"false"`。フォームはdisabled、`data-endpoint-ready="false"`、Site Key空。全5ページの `noindex, nofollow, noarchive` を維持します。
- 実Siteverify・メール受付／受信箱への到達・本番レート制限・公開前最終QA・店舗最終承認は未完了です。

基準：[README](../../README.md)、[要件定義書v1.6](../requirements/requirements_v1.6_2026-10-13.md)、[デザイン定義書v1.6](../design/design-system_v1.6_2026-10-13.md)、[画像管理表](../asset-map.md)、現在のコードと最新の明示指示。STEP 07.5のデザインを変更しません。

## A. アカウント・ドメイン

担当：店舗管理者・DNS担当・制作者。まず読み取り確認し、設定変更の承認を別途得ます。

- [ ] Cloudflareアカウント管理者・管理主体を確認。原則店舗管理、制作者は必要最小限の権限とし、パスワードを共有しない。
- [ ] Workers Free / Paidと課金責任者を確認。ドメインのFree / Pro等のプランとWorkersプランを混同しない。
- [ ] 正式ドメインの取得状況・所有者・更新管理担当を確認。
- [ ] DNS管理場所・既存メール設定・DNS変更権限を確認。
- [ ] Workers・Email Service・Turnstile・Accessを操作する担当と権限を確認。
- [ ] Git連携、Workers Builds等の自動デプロイ設定と対象branchを確認。
- [ ] 営業サンプルのmain・GitHub Pagesと正式Workerの公開環境を分離する。既存workflow・公開元を流用・変更しない。

Dashboardの確認先：アカウントMembers、Billing／Workersプラン、ドメインDNS、Workers & Pagesの対象Worker・Settings・Bindings・Domains & Routes・Builds。確認できない項目は未確認のまま進行条件に残します。

## B. メール通知

担当：店舗・Cloudflare管理者・DNS担当・制作者。

- [ ] 店舗管理用の固定通知先1件を確定し、使用承認を得る。問い合わせ者への自動返信は行わない。
- [ ] 利用可能なら確認済み宛先への無料送信方式を優先する。アカウントで利用可能か、現在の構造化 `EMAIL.send()` と受付結果 `messageId` に適合するか確認する。
- [ ] Email Service → Email Routing → Destination Addressesで宛先の確認状況を確認する。確認メールの送付も承認後に実施する。
- [ ] 送信元には管理・認証された利用可能ドメインのアドレスを使用する。利用者入力をFromや通知宛先にしない。
- [ ] 既存Email Routingドメインからの送信条件、またはEmail Sendingの送信ドメイン登録条件を確認する。Cloudflare DNSの利用可否を確認する。
- [ ] SPF・DKIM・DMARCと、必要なMXを既存メール環境と照合する。既存SPFを重複追加せず、既存MXやDKIMを無断で置き換えない。Sending用とRouting用の設定を区別する。
- [ ] `EMAIL` bindingを設定し、固定宛先制限 `destination_address` を第一候補とする。`CONTACT_TO`との一致を確認する。送信元制限の併用可否も確認する。
- [ ] 実メールテストの送信元・固定宛先・件数・日時・許可担当を確定する。未承認の実宛先には送らない。
- [ ] サービス受付と受信箱への到達を別々に確認する。迷惑メール、送信元表示、Reply-Toも確認する。本文・アドレス・受付ID等を公開資料やログへ転記しない。

公式仕様（2026-10-29確認）：確認済み宛先への送信はWorkers Free / Paidとも無料です。任意宛先への送信はWorkers Paidが必要です。無料対象でも送信元ドメイン・DNS・宛先確認等の準備は必要です。利用できない場合は代替サービスの必要性を報告し、無断でプロバイダー変更・実装追加をしません。[料金](https://developers.cloudflare.com/email-service/platform/pricing/)、[制限](https://developers.cloudflare.com/email-service/platform/limits/)、[宛先確認](https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/)、[送信binding](https://developers.cloudflare.com/email-service/configuration/send-bindings/)、[ドメイン設定](https://developers.cloudflare.com/email-service/configuration/domains/)

## C. Turnstile

担当：Cloudflare管理者・制作者。値をこの文書・Git・ログに残しません。

- [ ] 検証用widgetと本番用widgetを分離する。Managedモードを初期候補として決定する。
- [ ] 各widgetに許可hostnameを登録する。スキーム・ポート・パスは含めず、不要なhostnameを許可しない。
- [ ] Site Keyは公開値としてフロントエンドで管理するが、今回の空欄は変更しない。Secret Keyは対象環境のWorkers Secretとしてのみ管理する。
- [ ] 検証用・本番用・ダミーキーを混在させない。ダミーキーやモックの成功を実認証完了と扱わない。
- [ ] widgetのactionを `contact` とし、Siteverifyのsuccess・hostname・actionをすべて照合する。
- [ ] 許可された検証環境で実動作を確認する。期限切れ・使用済み・不正トークンではメールが送信されないことを確認する。
- [ ] Siteverify障害・タイムアウトで失敗扱いとなり、Secret・トークンがレスポンスやログへ出ないことを確認する。

トークンは最大2,048文字、有効期間300秒、単回使用です。hostname許可とサーバー側の完全一致照合は別々に確認します。[widget管理](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/)、[hostname管理](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/)、[Siteverify仕様](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## D. Workers設定項目

設定場所は承認された対象Workerの環境別設定です。通常変数はVariables、SecretはSecrets、bindingはBindingsまたは対象環境のWrangler設定で管理します。検証用から本番用への自動流用・継承を前提にしません。

| 設定名 | 用途・種類 | 設定場所 | 必要条件・確認方法 |
|---|---|---|---|
| `CONTACT_API_ENABLED` | API許可／通常変数 | 対象環境Variables | 現在 `"false"`。承認後に厳密な文字列 `"true"`だけ許可。初期POST 503を確認 |
| `EMAIL_SENDING_ENABLED` | メール許可／通常変数 | 対象環境Variables | 現在 `"false"`。承認された実送信テストまで維持。片方でも無効なら外部通信しない |
| `TURNSTILE_SECRET_KEY` | Siteverify認証／Secret | 対象環境Secrets | 現在未設定。正しいwidgetの登録有無を確認し、値を表示・転記せず実認証で照合 |
| `CONTACT_ORIGIN` | 同一origin制限／通常変数 | 対象環境Variables | 現在未設定。正規HTTPS origin、パス・末尾スラッシュなし。リクエストURLとOriginヘッダーが一致することを確認 |
| `TURNSTILE_HOSTNAME` | 認証hostname照合／通常変数 | 対象環境Variables | 現在未設定。originのhostnameと完全一致。Siteverifyのhostname不一致拒否を確認 |
| `CONTACT_FROM` | 固定送信元／サーバー側変数 | 対象環境Variables。非公開管理ならSecret | 現在未設定。許可ドメイン・アドレスを確認し、承認されたテストのFromで照合 |
| `CONTACT_TO` | 固定通知先／サーバー側変数 | 対象環境Variablesまたは非公開のSecret管理 | 現在未設定。確認済み固定宛先とbinding制限が一致することを管理者が確認 |
| `EMAIL` | メール送信／`send_email` binding | 対象環境Bindings／Wrangler設定 | 現在未設定。`send()`と受付結果`messageId`、固定宛先制限を確認。受付と到達を区別 |
| `CONTACT_RATE_LIMITER` | 連打制限／Rate Limit binding | 対象環境Bindings／Wrangler設定 | 現在未設定。`limit()`、環境別namespace・閾値、超過429・障害503を確認 |

- [ ] 上記全項目を環境別に確認し、フラグだけで有効化できたと判断しない。
- [ ] 必須設定が欠ける場合、POSTは本文読み取り・Siteverify・メール処理より前に503になることを確認する。
- [ ] 不一致originは403、入力不正は400、本文超過は413、Content-Type不正は415、GET等は405、未知APIは404を確認する。
- [ ] エラーに入力値・内部例外・認証情報を含めず、CORS許可を追加しない。

注意：通常の `wrangler secret put` は直ちに新バージョンをデプロイします。Dashboardでの設定適用も公開状態を変え得ます。登録方式・対象環境・適用操作まで承認範囲を確認し、資料整備や読み取り調査の段階では実行しません。[Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

## E. レート制限

- [ ] 現在の共通キー `contact:submission` を確認する。名前・メール・IP・トークンをキーやログに記録しない。
- [ ] 同じ地域の全利用者が枠を共有し、正常利用者も巻き込まれ得ることを承認担当へ説明する。入力検証前に消費するため、不正入力も枠を使用する。
- [ ] 検証環境の初期案：5リクエスト／60秒／地域。本番環境の初期案：10リクエスト／60秒／地域。どちらも提案値で、最終閾値は未確定。
- [ ] `namespace_id`を環境ごとに分離する。既存namespaceとの衝突・共有を確認する。
- [ ] 超過時429、binding不足・障害・不正応答時503、いずれも送信しないことを確認する。
- [ ] 想定問い合わせ量と悪用時の巻き込みを評価し、Turnstile・origin照合と併用する。必要なら入口側の追加対策を別途検討する。

公式bindingは地域単位の概算制限で、厳密なグローバル制限ではありません。`namespace_id`はアカウント内で区別する正の整数形式の識別子です。全世界で厳密な上限が必要かを判断し、小規模店舗に不要な仕組みを追加しません。[Rate Limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)

## F. 重複通知

- [ ] サービス受付後の通信断、または5秒の送信タイムアウト後に、新トークンで再送すると重複通知し得ることを確認する。タイムアウトでbinding側の受付まで取り消せるとは限らない。
- [ ] 現在はフロントエンドの処理中二重送信防止があり、API・フロントエンドとも自動再送なし。再読み込みや手動再送まで防ぐ保証はない。
- [ ] Turnstileの単回使用だけでは、別トークンによる同じ内容の再送を防げないことを共有する。
- [ ] 店舗と、まれな重複通知の許容可否・結果不明時の案内・確認方法を決める。
- [ ] 許容できない場合のみ、再送でも維持する冪等性キーと短期の受付記録を検討する。入力本文・メールアドレス等の不要な保存はしない。
- [ ] KVの結果整合性、D1の一意制約、Durable Objectsの集約制御と運用負担を比較する。外部メール処理との原子的な一体化はできず、単独で完全な一度限りの配送を保証しない。

現在、冪等性キー・DB・永続ストレージはありません。このチェックリスト作成では追加しません。保存が必要な案はv1.6のDB非保存方針との整合性も別途確認・承認します。

## G. 検証環境

- [ ] 本番と分離した専用Workerと固定HTTPS originを第一候補として承認する。Secrets・bindings・Turnstile widget・レート制限namespace・テスト宛先を独立させる。
- [ ] Cloudflare Access等で担当者だけにアクセスを限定する。noindexをアクセス制御の代わりにしない。
- [ ] 公開可能なworkers.dev・カスタムドメイン・Preview URL等を列挙し、未認証のGET／POSTが全入口で拒否されることを確認する。
- [ ] 初期状態はAPI・フォーム無効。全5ページのnoindexを維持する。
- [ ] 無効POST 503、5ページ200、CSS/JS/WebPの内容とContent-Type、未知URL404を先に確認する。
- [ ] 原本、未使用画像、docs、AGENTS／CLAUDE／README、Workerソース、設定、Secretファイル、Git情報、JSON-LD入力資料が取得できないことを確認する。
- [ ] 出力が許可リスト39件と完全一致することを確認する。
- [ ] 実Siteverifyをメール送信より先に検証する方法を別途準備する。現在のAPIには認証だけのモードがなく、メール設定・有効化も必須。隔離した検証手段で認証処理だけを確認し、公開HTTPヘッダー・クエリによるガード回避を追加しない。
- [ ] 許可後に限り検証環境でAPIを有効化し、固定テスト宛先への通知と拒否系を確認する。本番設定・本番フォームは無効のまま維持する。

Wrangler 4.154.0はWorker Previewsに対応しますが、Previewは標準で公開アクセス可能です。Version URLsは設定済み本番リソースを使用するため、隔離された検証環境と扱いません。採用するならメール宛先・bindingまで明示的に分離します。現在の `npm run dev` は `--local` のため実メール検証用の起動方法ではありません。[Previews](https://developers.cloudflare.com/workers/previews/)、[検証方式の比較](https://developers.cloudflare.com/workers/previews/compare-workflows/)、[Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)

## H. 本番公開条件

- [ ] 許可された環境でCONTACTのメール受付・実受信・Reply-Toを確認済み。
- [ ] 実Turnstile認証・hostname/action・期限切れ・再利用拒否を確認済み。
- [ ] レート制限・障害時拒否・重複通知方針を確認済み。
- [ ] 原本・非公開資料・未使用画像・秘密情報を配信しないことを確認済み。
- [ ] 全5ページを360 / 390 / 430 / 768 / 1024 / 1440pxと主要実機ブラウザーで最終QA済み。
- [ ] 写真の最終掲載許可・権利、住所・Google Mapsの店舗ピンを確認済み。
- [ ] 正式ドメイン・DNS・HTTPS・正規URL、canonical／OGP／JSON-LD／sitemap／robots.txt等のSEO、GA4・個人情報非送信を確認済み。
- [ ] 店舗の全ページ最終承認と、要件上の公開条件・支払条件を確認済み。
- [ ] 営業サンプルmainへ影響しない公開計画、監視担当・障害時のAPI無効化手順を承認済み。
- [ ] 現在のbuildはフォーム無効・Site Key空・noindexを必須にするため、将来の有効化時はbuild検証とテストの条件変更を別工程でレビューする。検証を迂回しない。
- [ ] 公開工程の明示許可後にのみ本番有効化と検索公開を判断する。公開承認前にnoindexを解除しない。

## 次工程の順序と停止条件

1. 店舗管理者・制作者がAの未確認事項を確認。権限や所有者が不明なら停止。
2. 店舗・DNS担当がBの送信方式・送信元・固定通知先を承認。利用条件が合わなければ報告して停止。
3. 権限を持つ担当者が、別途許可された工程でC・Dの検証用設定を準備。APIフラグはfalseを維持。
4. 店舗・制作者がE・Fの運用方針を確定し、Gのアクセス制限付き環境構築の許可を得る。
5. 制作者が無効API・静的配信・非公開ファイル除外を検査。その後、個別許可を得て実Siteverify、実メール受付・到達の順に確認。
6. 検証環境でのフロントエンド送信有効化は結果確認後に別途判断。本番無効状態を自動的に変更しない。
7. Hをすべて確認し、店舗承認と別の公開指示を得て正式公開へ進む。

チェックの記録は「担当・日付・結果・未解決点」に限定します。認証情報・メール本文・個人情報を含めず、未実施の確認にチェックを付けません。
