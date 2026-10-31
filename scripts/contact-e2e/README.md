# CONTACT専用E2Eのローカル準備

このディレクトリは専用Workerの候補実装。Cloudflareには未作成・未配置。
既存Stagingと通常ビルドの設定・ソース・生成物は変更しない。
公開39ファイルへこのディレクトリを追加しない。

## ローカルで実行できる検証

リポジトリrootから以下を実行する。remote・認証・Wranglerは起動しない。

```sh
node scripts/contact-e2e/build.mjs
node --test scripts/contact-e2e/runtime.test.mjs
```

build CLIは初期安全モードだけを生成し、引数による有効化を拒否する。
出力は `scripts/contact-e2e/.generated/safe/` の39ファイル。
ローカル `.gitignore` で生成物を除外する。通常dist・dist-stagingは操作しない。
既存の許可リスト・参照検査・原本対応検査を再利用する。

既存Playwrightが使える場合は `node scripts/contact-e2e/browser.mjs`。
必要なら既存モジュールへの絶対パスを `PLAYWRIGHT_MODULE` に指定する。
全リクエストをメモリ上で応答または拒否し、実SDK・Siteverify・APIに接続しない。
これは390pxの合成表示検査であり、Accessや実認証の試験ではない。
`browser.mjs`のimportは検証を開始しない。明示的な`runBrowserChecks()`呼び出しか
CLI直接実行時だけPlaywrightを読み込む。CLIのSIGINT・SIGTERM・SIGHUPは中断として扱い、
ブラウザー解放後に終了コード130とする。SIGKILL・OS強制終了の後処理は保証できない。

## 3モード

|モード|API・メールフラグ|メール能力|フォーム|
|---|---|---|---|
|safe|両方文字列false|実bindingなし。APIは503|元HTMLと同じ、disabled・Site Key空|
|negative|専用構成でのみ両方文字列trueが必要|実EMAIL/RAW_EMAILを拒否。内部の必ず失敗するEMAILを使用|専用生成のみ有効化可能。成功表示を偽装しない|
|live|両方true＋E2E_LIVE_APPROVALの明示一致|固定枠のSQLiteガード経由のみ|別承認後に専用生成。今回は実環境で使用しない|

実行可能なWrangler設定は `wrangler.safe.jsonc` のみ。
`workers_dev: false`、`preview_urls: false`、routes・Cron・実Email・Rate Limiter・Secretsなし。
Durable Objectは `DeliveryGuard` をSQLiteで新規作成する設定案だが、まだ作成していない。
安全設定をデプロイしてもAccessが設定済みになるわけではない。

negative/liveの設定は将来の別承認で作成する。HTTPヘッダー・query・本文でモードを選べない。
negativeでは実Email bindingが誤って存在すると後続処理を無効化する。
Siteverifyを通過しても `MAIL_UNAVAILABLE` の503となり、ok:trueを返さない。
Rate Limiter超過は429、認証拒否は400。生応答・トークン・入力値を診断ログに出さない。
個別呼び出し回数はローカルハーネスだけで観測する。公開の診断・解除APIはない。

## 固定設定の案と将来の前提

- Worker候補名 `bashiiin-coffee-contact-e2e`、hostname候補
  `bashiiin-coffee-contact-e2e.misemiruweb.workers.dev`。存在・利用可否は未確認。
- CONTACT_FROMは `bashiiin-staging@misemiruweb.com`、CONTACT_TOは `misemiruweb@gmail.com` のみ。
- CONTACT_ORIGINは上記hostnameのHTTPS origin、TURNSTILE_HOSTNAMEはhostnameのみ。
- actionは既存モジュールの `contact`。E2E用widget・Secretを別途準備する。
- liveのメールbindingは **RAW_EMAIL**。将来の設定案は
  `send_email: [{ name: 'RAW_EMAIL', destination_address: 'misemiruweb@gmail.com' }]`。
  APIへ渡すEMAILは内部アダプターであり、実bindingをそのまま渡さない。
- Rate Limiter名は `CONTACT_RATE_LIMITER`、共通キーは既存の `contact:submission`。
  namespaceは31001と分離し、アカウント調査後に決定する。今回はIDを追加しない。
- liveの追加承認変数は `E2E_LIVE_APPROVAL: 'APPROVED_ONE_ATTEMPT'`。
  これは運用上の明示ガードであって人間の承認やAccessの代替ではない。
- 専用フォームの生成関数は `inventory(mode, env)` / `build(mode, env)`。
  negative/liveには `E2E_HOSTNAME` 完全一致、`E2E_FORM_APPROVAL: 'APPROVED_E2E_FORM'`、
  公開用 `E2E_TURNSTILE_SITE_KEY` が必須。Secretを参照しない。
  CLIからはsafeのみを生成する。今回はモック内で公式テスト用Site Keyだけを使用する。
- 有効化生成物でもHTMLのボタンはdisabled。既存script.jsがトークン取得後に有効化する。
  既存script.jsは変更しない。生成物を別hostnameへコピーしない。サーバーはOriginを照合する。

## 送信経路・永続ガード

HTTP → 同じhandleContact → 入力検証・Rate Limiter・実Siteverify →
内部EMAILアダプター → 固定名 `contact-e2e-single-attempt-v1` のDO → sendOnce → RAW_EMAIL.send。
RAW_EMAIL.sendの呼び出しはguard.mjsの1か所だけ。
DOにHTTP fetch・reset・alarmを実装しない。クライアントから枠IDを受け取らない。
DOのsendOnceはlive承認・固定宛先等を再検査する。CC/BCC/添付等の追加キーを拒否する。

SQLiteのtransactionSyncで固定行を確認してINSERTし、transaction外でstorage.syncを待つ。
永続化が成功した後だけメールを1回呼ぶ。再実行され得るtransaction内では送らない。
並行RPCは同じ行で拒否される。永続化・DO・RPC異常は送信不可。
成功・受付失敗・空messageId・タイムアウト・プロセス再起動後も行を消さない。
独立メール検証のローカル固定ロックには一切触れない。

この保証は同じWorker・DO namespace・固定枠・コードを保持する範囲の最大1試行。
namespaceや固定名の変更、DO削除、PITRによる過去への復元で保証を破壊し得る。
実行後はこれらを行わない。結果不明時の再送・自動解除・自動リトライは禁止。
サービス受付とGmail到達は別々に確認する。厳密なexactly-once配送保証ではない。
5秒のメール待機タイムアウト後に受付が完了する可能性があるが、枠は既に消費済み。

## 将来の初回導入手順（今回は実施しない）

ローカルのコード・モック試験は実施済み。以下は将来の提案であり、Dashboard画面・権限・
未公開WorkerへのAccess適用は実環境で未検証。各操作は対象と影響を確認した別承認工程とする。
この文書はデプロイ・公開・復旧・実送信の実行許可を与えない。

### フェーズA：事前確認

1. WranglerとDashboardの対象アカウントが一致することを、値を記録せず照合する。
2. 候補Worker名の重複・hostnameの利用可否を確認する。同名の既存Workerがあれば上書きせず停止。
3. Worker作成、Worker単位のAccess設定、SQLite-backed DOに必要な権限を確認する。
4. Workers Free・SQLite DOの利用枠、Accessの契約・ユーザー枠、Verified宛先への無料送信条件を確認する。
   アカウント固有の利用可否・残量は未確認。課金を伴う変更や有料プラン購入へ自動的に進まない。
5. 専用設定の差分、アカウント全体のAccess継承・bypass、Git自動デプロイの有無を確認する。
   既存Staging・Pages・他Workerへ設定を広げない。影響範囲が不明なら停止。
6. 初回は実メールbinding・実Secret・Rate Limiterを追加しない。既存Secretを読み出さない。

### フェーズB：公開経路なしで初回Workerを作成

**初回デプロイは将来の独立した承認が必要。** 承認前に作成・アップロードしない。
`wrangler.safe.jsonc`と専用safe出力をレビューし、次をすべて確認する。

- workers_devはfalse、preview_urlsもfalseを明示する。
- routes・Custom Domain・Cronは追加しない。他の公開経路・共有機能も作成しない。
- CONTACT API・メールフラグは文字列false。実Email・実Secretなし。
- フォームdisabled、Site Key空、全5ページnoindex・nofollow・noarchive。
- 専用safe生成物は許可リストの39ファイルのみ。通常dist・dist-stagingを使用・変更しない。
- DO初期登録は専用クラス・namespaceだけ。既存のDO・Stagingを変更しない。

承認後に公開経路なしでWorkerを作成し、DashboardのDomains & Routes等で実際の無効状態を確認する。
新規作成時の挙動は未検証。公開を要求するUIや予期しないURLが現れたら確定せず停止する。
この時点では到達可能なHTTP URLを前提にせず、302・認証済み503を確認済みと扱わない。

### フェーズC：作成済みの専用WorkerへAccessを適用

公式資料上の手順は Workers & Pages → 作成した専用Worker → Access →
Protect this Worker behind Access → All traffic → Authentication policy → Apply Access。
管理者が実画面と権限を確認してから操作する。UI表記・利用可否は未確認。

- 対象は専用Worker1件のみ。Protect all Workersやアカウント全体の設定を変更しない。
- 許可対象は既存の管理者1名のみ。ポリシー名だけで判断せず、実際の許可条件・bypassも確認する。
- Previews onlyではなくAll trafficを選択し、通常トラフィックも対象にする。
- **未公開状態のWorkerへ保護を設定できない場合、workers.devを有効化せず停止する。**
  UI・権限の問題を回避するために一時公開しない。代替手段も別途調査・承認が必要。

### フェーズD：保護を確認してからURLを有効化

Dashboardで対象Worker、All traffic、管理者1名の許可条件、bypassなしを再確認する。
保護が未適用・対象不明・Previews onlyであれば停止する。

確認後、別承認された設定変更で**専用Workerだけ**workers.devを有効化する。
この操作で外部から到達する経路が生まれるため、Access確認前に有効化しない。
Preview/Version URLは無効を維持し、routes・Custom Domainは追加しない。
既存Stagingは両フラグfalseのまま変更しない。

現在の`wrangler.safe.jsonc`と`validateSafeConfig()`はworkers_dev=falseを必須としている。
このチェックを弱めず、保護後のURL有効化は将来の専用設定・検証を別レビューする。
Dashboardだけで変更した場合も、後日のWrangler反映との設定不一致を解消するまで再配置しない。

### フェーズE：公開直後の安全確認

未認証と認証済み管理者のセッションを分離し、Cookie・認証ヘッダーを記録せず確認する。

1. 未認証のページ、画像、POST /api/contactがAccessで拒否・認証誘導されること。
   ログインページへの302は認証済みAPIの応答ではない。サイト本文・画像が返らないことも確認する。
2. 認証済み管理者だけが5ページを表示できること。
3. 認証済みPOST /api/contactが503、フォームdisabled、全ページnoindex、実メール送信なしであること。

**未認証で本文・画像・APIの保護漏れがあれば、以降の検証を停止する。**
公開経路の無効化を優先するが、復旧操作にも対象を限定した独立の承認が必要。
自動Rollback・Access変更は行わず、速やかに報告して承認を求める。
復旧時はworkers.devだけでなく下記の別URL経路も確認し、DOの消費状態を削除・巻き戻ししない。

### フェーズF：後続検証

専用widget・Secret、31001と分離したRate Limiter namespace、DO実環境検証を別承認で準備する。
実メール能力なしのnegative構成で入力・認証・レート制限の異常系を先に確認する。
liveの実メールbinding追加・フロント有効化・**正常系1通の実送信は独立した承認工程**とする。
合成入力だけを使う。サービス受付とGmail到達を分けて確認し、結果不明時は再送しない。
現在の失敗表示が再試行を案内しても再送しない。
検証後はAPI・フォームを無効へ復旧し、DOの消費状態を保持する。
未認証302・認証済み503を再確認してQAへ記録する。namespace削除・変更・PITRで枠を再発行しない。

## 公開URLの取りこぼし確認

|経路|初期状態と将来の確認|
|---|---|
|通常workers.dev|Bではfalse。CのAccess確認後にDで当該Workerだけ有効化|
|Version URL（旧Preview URL）・alias|preview_urls=falseを明示し、DashboardのVersion URLs等でも無効を確認|
|Workers Previews・Deployment URL・共有リンク|今回は作成しない。存在・別機能の有効状態は実環境で未確認。見つかったら個別に対象と保護を確認するまで停止|
|routes・Custom Domain|追加しない。Dashboardにも意図しない登録がないことを確認|

workers_dev=falseだけではVersion/Preview/Deployment URLの無効化を保証しない。
公式資料ではDOを実装するWorkerにはVersion URLを生成しない制限があるが、
これだけを保護の根拠にせずpreview_urls=falseを維持する。
Worker単位のAll trafficは関連ドメイン・routes・workers.dev・previewsを保護する公式仕様だが、
今回のアカウントでの適用・各URLへの効果は未検証。新しいプレビュー機能への適用も推測しない。
noindexはアクセス制御の代替ではない。未確認のURLがあれば公開開始を保留する。

Cloudflare上でのAccess・DO永続性・Secret・Rate Limiter・実メール・到達は今回未検証。
ローカルworkerdのSQLite試験、合成Siteverify、合成メール受付を実環境成功と呼ばない。
今回commit・push・deployは行わない。

仕様参照（実アカウント操作なし）:
- https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/
