# CONTACT異常系専用Worker（ローカル準備）

Worker名は `bashiiin-coffee-contact-negative`。safeの初期導入・Access保護は
[2026年11月1日のQA記録](../../docs/qa/contact-negative-worker-initial-deployment-2026-11-01.md)を参照。
今回のローカル変更ではCloudflareの最新状態を再取得・変更しない。negativeは未配置。
既存Staging、既存E2E Worker、DeliveryGuard、独立メール検証の固定ロックを操作しない。
このディレクトリ外の既存ファイルは変更しない。

## 実メール能力を持たない理由

worker.mjs → 既存handleContact → 設定・Origin・Rate Limiter・入力検証 →
Siteverify → 既存sendNotification → 内部rejectMail.send → 例外 → 503 MAIL_UNAVAILABLE。

- rejectMailは非公開・凍結済みの固定オブジェクト。外部のEMAILを渡さず、messageIdを生成しない。
- 実Email、RAW_EMAIL、DO、Service binding、mail provider認証情報を設定しない。
- エントリーポイントの依存は専用policyと既存CONTACT共通モジュールだけ。
  既存E2E worker・guardをimport/exportしない。live分岐はない。
- 予期しない環境キーがあればAPIを無効側へ倒す。HTTPのquery・header・JSONでモードを選べない。
- send_email・DO migration・DO namespace参照・Service binding・remote等は設定の許可リスト外。
- 共通mail.mjsの汎用binding.sendはバンドルに残るが、到達先は固定の拒否オブジェクトだけ。
  実Email bindingを取得する機能はなく、受付成功を偽装しない。
- HTTPルートは /api/contact のみ。未知APIは404。解除・診断用の公開APIは作らない。

これはこのコード・承認された設定・依存関係を維持する範囲での送信能力の隔離。
アカウント管理者がコードや設定を任意に書き換えた場合まで禁止できる仕組みではない。

## safeとnegative

| 項目 | safe | negative（未完成の将来用設定） |
|---|---|---|
| E2E_MODE | safe | negative |
| 両APIフラグ | 文字列false | 専用設定でのみ文字列true |
| フォーム | disabled・Site Key空 | 専用生成のみ。HTML初期ボタンはdisabled、認証後に既存JSが操作可能にする |
| Secret | なし | 将来専用Secretが必要。値は保存しない |
| Rate Limiter | なし | ローカル設定に暫定ID31002。未予約・最終確定前・実binding追加未承認 |
| メール・DO・Service | なし | なし |
| 正しいトークンの最終結果 | 設定ガードで503 | 合成EMAILによる503、ok:false |

両フラグtrueは共通APIの設定検証へ進むための隔離試験条件であり、実メールを許可する意味ではない。
片方false、設定不足、不正モードではSiteverifyより前に503となる。
共通API本体・通常版・Staging版の安全条件を変更しない。

## 現在の設定と実施不可の条件

safe設定はworkers_dev=false、preview_urls=false、routes・Custom Domain・Cronなし。
ASSETS以外の実サービスbindingや実Secretはない。公開39ファイルは .generated/safe/ のみ。

wrangler.negative.jsoncは**意図的に配置禁止**であり、デプロイ可能な完成設定ではない。
ratelimitsには暫定の`namespace_id: "31002"`、binding名`CONTACT_RATE_LIMITER`、5回/60秒を設定している。
keyは既存共通実装の`contact:submission`から変更しない。31001は既存Staging専用として保持する。
31002は4 Worker・10 Versionの調査で使用が見つからなかった候補にすぎず、
アカウント全体・別環境・古いVersion・他の未配置設定での未使用保証や予約を意味しない。
実環境へのbinding追加は未承認で、実Rate Limiterの429も未検証。
secrets.requiredには名前だけ宣言している。今回、専用Site Key・Secret値を取得・設定しない。
custom buildはリポジトリrootから `node scripts/contact-negative/build.mjs --require-negative-ready` を呼ぶ。
このhookは無条件に非ゼロ終了する。承認用環境変数、Site Key、namespace ID、CLIの`--var`で解除する機構はない。
`requireNegativeReady()`、`inventory('negative')`、`build('negative')`も停止する。
negativeのmainは意図的に存在しない`__NEGATIVE_DEPLOYMENT_DISABLED__.mjs`を指定する。
hookを削除した隔離テスト用設定でも、このentrypointの欠落でWranglerの準備が停止することを検査する。
safeの設定・entrypoint・通常buildは維持する。Cloudflare上の既存safe配置は変更しない。

### 停止できる範囲と限界

対象negative設定とbuild.mjsを変更せずに使う通常のWrangler CLI経路を停止する。
明示config、従来の自己申告承認値、合成Site Key、`--var`、`--no-bundle`、`--assets`上書き、実workerへのpositional entrypoint指定を
オフラインdry-runで検査する。`--no-build`のような未対応引数は解除方法ではない。
これはCloudflareアカウントの権限制御を代替しない。
設定・hook・ファイルを改変する、別configや別ツール・APIを使う権限を持つ操作者の配置まで完全には防止できない。
hook削除とentrypoint上書き等を組み合わせる改変も、この保護範囲の外となる。
デプロイ権限・認証情報の管理と独立した人間の承認は引き続き必要である。
custom buildの削除・差し替えやCLI上書きで停止を回避しない。

将来の独立承認後に必要なもの：

- 暫定31002のアカウント内重複・利用予定を再確認し、最終採用を独立承認する。31001は禁止。
  binding名CONTACT_RATE_LIMITER、5回/60秒、keyは共通実装のcontact:submission。
  現在の静的検証はこの31002と制限値の完全一致だけを許可し、namespace欠落や別IDも拒否する。
  IDを再選定する場合は設定・検証・テストを別途更新してレビューする。
- 対象hostname専用widget・Site Key・TURNSTILE_SECRET_KEY。StagingのSecretは流用しない。
- 専用WorkerへのAccess All traffic・管理者1名・bypassなしの確認。
- 配置禁止の解除には、別途コード・設定変更、安全監査、Git保存、明示承認が必要。
  現時点では解除機構を実装しない。従来の承認用環境変数による自己申告は解除条件として使わない。
- namespace確定後も専用Site Key・登録済みSecret・Access・実bindingsの監査が必要。
  実Email・RAW_EMAIL・DO・Service bindingを追加せず、既存DeliveryGuardを利用しない。
  negativeの実デプロイには別承認が必要。実メール送信は禁止する。
- 現在の初期設定を弱めず、Access確認後のProduction URL ONとsafe復旧用設定を別レビューする。

対象hostnameは bashiiin-coffee-contact-negative.misemiruweb.workers.dev。
固定OriginはそのHTTPS origin。送信処理の共通検証に必要なFROM/TOは確認済みのStaging候補値を使うが、
これらを設定してもメールbindingが生まれるわけではない。
現在のsecrets.required宣言はWorkerにSecretが登録済みであることを証明しない。

## ビルドとローカル検証

リポジトリrootで、既存依存だけを使う。

```sh
node scripts/contact-negative/build.mjs
node --test scripts/contact-negative/runtime.test.mjs
```

buildの通常実行はsafe39ファイルだけを生成する。出力はこのディレクトリ内でGit対象外。
原本・管理資料・Workerソースは配信しない。通常dist・dist-staging・既存E2E生成物は触らない。
パス逸脱・シンボリックリンクを拒否し、出力一覧と内容を許可リストへ完全照合する。
全5ページのnoindex, nofollow, noarchiveを検査する。

negativeの配信用出力は、入力値にかかわらず生成しない。Site Key・hostname・承認文字列を渡しても停止する。
実Secretはビルドで読まない。
未登録のSite Keyを勝手に補完せず、公式テストキーを公開生成物へ書かない。

mockInventoryは公式テスト用Site Key入りのHTMLをメモリ内で返すだけで、出力先や実bindingを扱わない。
この固定のモック経路は配置用buildから分離しており、配置禁止の解除を必要としない。
ローカルworkerdでは、合成Secret/トークン・モックRate Limiter・モックSiteverifyだけを使い、
外向き通信を既定拒否する。実メール・DO・既存Stagingへの呼び出し先は設けない。

### Site Key連携のメモリ内プレビュー

`preview.mjs`はbuild.mjsに依存しない独立モジュールで、import・再importでは処理を開始しない。
`previewInventory({ siteKey, origin })`を明示的に呼ぶと、39ファイル分の名前とBufferをメモリ内で返す。
CLI・サーバー・書き出し機能を持たず、negative配信用出力や既存生成物は作成・更新しない。

- Site Keyは`PREVIEW_TEST_SITE_KEYS.success`と`.failure`に隔離したCloudflare公式テストキーだけを許可する。
  未指定・不正値・実キー形式の値も拒否する。実Site Key・Secretは使用しない。
- 将来の公開Site Key供給名は`NEGATIVE_TURNSTILE_SITE_KEY`とするが、今回その環境変数は読まない。
  実キー反映とSecret登録はそれぞれ別承認。SecretをHTML・JS・ログへ渡さない。
- origin引数は`https://bashiiin-coffee-contact-negative.misemiruweb.workers.dev`との完全一致が必要。
  生成版JSでも`window.location.origin`、`data-contact-negative-only="true"`、専用hostname属性を照合する。
  localhost、別Worker、類似サブドメイン、別ポート、HTTPではwidget・POSTを許可しない。
  URLパラメータ・hash・localStorageを有効化条件にしない。
- 差分はCONTACT HTMLと生成版`script.js`の2件だけ。残り37件、全5ページのnoindex、HTML初期disabledを維持する。
  safeの出力・共通HTML/JSは変更しない。Site Keyを入れるのはCONTACTフォームのdata-sitekeyだけ。
- 既存JSの送信・エラー処理・ナビゲーション等を再利用し、既知の箇所だけを単一一致で置換する。
  元JSの構造が変わり置換条件が一致しなければ生成を拒否する。actionはcontactを維持する。
- 専用origin上のテストフォームは模擬トークン取得後だけ操作可能となるが、APIはモック503で拒否する。
  誤ってモック200が返っても成功表示・generate_leadへ進ませず、既存の失敗表示・トークン破棄へ進む。
  safeは常に送信無効。実Email・DO・Service能力や既存DeliveryGuardへの経路は追加しない。

フロント側origin検査は補助策であり、サーバー側のOrigin・hostname・Siteverify検査を代替しない。
ブラウザーのSDKコールバック・API応答はテスト側の合成fixtureで、Cloudflareによる実認証ではない。
実Siteverifyは呼ばず、既存workerdテストによる模擬Siteverify成功後の503確認と、
ブラウザーのモックAPI確認を別々の検証として扱う。
このメモリ内プレビューをCloudflareや実Worker URLへ送信せず、公式テストキーをsafeアセットに混入させない。

将来は、実キー反映の設計・個別承認、ローカル検証、独立安全監査、Git保存、
実環境変更の個別承認を順に行う。配置禁止の解除は別途コード変更・再監査が必要であり、
プレビュー実装やSite Key準備によって解除されたとは扱わない。

既存Playwrightが利用可能なら `node scripts/contact-negative/browser.mjs`。
PLAYWRIGHT_MODULEで既存モジュールのパスを指定できる。新規インストールはしない。
全リクエストをメモリ内で応答または拒否し、実SDK・Siteverify・APIへ接続しない。
HTTP要求イベント数とroute処理数を照合し、Service Workerを禁止、WebSocketも拒否する。
ブラウザーにはループバックの失敗用proxyも指定し、通信を外部へ続行するrouteは実装しない。
390pxの5ページとsafe/negativeのフォームを確認する。503時は失敗表示・入力保持・トークン破棄、
generate_leadなしを期待する。実メール成功の画面にはしない。
既存12シナリオに、誤origin・マーカー欠落・URL/storage指定・SDK障害・誤200等の12シナリオを追加する。
importだけではPlaywright・Chrome・通信・書き込みを開始しない。
明示実行時もfinallyでブラウザーを解放し、CLI中断で終了する。SIGKILL/OS強制終了は保証外。

Wrangler検査は固定4.154.0のオフラインdry-runのみ。
safeは生成バンドル・binding一覧を照合し、negativeは無条件停止と無効entrypointによる拒否を確認する。
バンドルの依存一覧に既存E2E/live/guard、DOクラス、実メールAPIへの別経路がないことを監査する。
この検査をCloudflare上の利用可否・Access・Secret・実認証の証明として扱わない。

## 将来の導入・復旧（今回は実施しない）

1. 新Worker名の不存在、アカウント・Free利用枠・権限・設定差分を確認して別承認を得る。
2. safeで公開経路なしの初回配置。Production/Preview URL、routes、Custom Domain、Cronがないことを確認。
3. 作成した当該WorkerだけにAccess All traffic・管理者1名の許可を設定する。
   未公開のまま保護を設定できないUI・権限の場合、公開せず停止する。
4. 保護確認後に、別承認した専用設定でProduction URLを有効化する。Preview/Version URLはOFFを維持。
   その他の公開URL・bypass・Service bindingも確認する。既存Staging/E2Eには広げない。
5. **Production URL有効化直後に、下記の初回安全確認をすべて完了する。**
   完了するまで専用widget・Secret・Rate Limiterの準備、negativeモード導入、実Siteverifyへ進まない。
6. 専用widget・Secret・独立Rate Limiterの追加はそれぞれ別承認。
   negative配置には、配置禁止解除のコード・設定変更、安全監査、Git保存、明示承認が先に必要。
   実Siteverify試験も別承認とする。
   初回のsafeバージョン、静的ファイル、非機密設定とbinding/Secretの名前を復旧用に記録する。
7. 反映前後にEmail/DO/Service能力がないことを管理情報・バンドル両方で確認する。
   Rate Limiterは近似制限なので必ず6回目の429とは断定せず、承認した回数で試験を止める。
8. 失敗・タイムアウト・結果不明時は自動再デプロイ・自動再試験をせず、読み取り確認して報告する。
9. 別承認で当該Worker自身をsafeへ復旧。両フラグfalse、フォームdisabled、noindexを確認する。
   Production URLがONの環境へworkers_dev=falseの初回safe設定を無条件に再デプロイしない。
   URL/Access/bindings/Secretとの整合性をレビューしたsafe復旧設定を別途用意する。
10. 復旧後も、未認証の認証誘導と認証済みPOST503・disabled・noindexを再確認しQA記録する。

### 初回公開直後の必須安全確認（将来の承認済み工程）

対象は `bashiiin-coffee-contact-negative` だけとする。以下は実環境では未実施の計画であり、
今回のローカル検証でDashboard操作・HTTP通信を行うものではない。

1. Production URLをONにする前に、対象WorkerのAccessがAll traffic・管理者1名の許可であることを再確認する。
2. 別途承認後、当該WorkerのProduction URLだけを有効化する。
3. Preview/Version URLはOFFを維持する。
4. 未認証GET `/` がAccess認証へ誘導または遮断され、サイト本文を取得できないことを確認する。
5. 未認証GET `/contact/` についても同様に確認する。
6. 未認証GET `/styles.css` が保護され、CSS本体を取得できないことを確認する。画像についても本文が公開されていないか確認する。
7. 未認証GET `/api/contact` がAccess認証へ誘導または遮断されることを確認する。
8. 認証済み管理者がCONTACTページを正常に表示できることを確認する。
9. 認証済みPOST `/api/contact` がsafeモードの想定どおりHTTP 503を返すことを確認する。
10. CONTACT送信ボタンのdisabledプロパティがtrueで、disabled属性も存在することを確認する。
11. robotsが `noindex, nofollow, noarchive` であることを確認する。
12. 実Email binding・DO bindingが存在しないことを管理情報で再確認する。

302等のリダイレクトは、遷移先が適切なAccess認証画面であることまで確認する。
HTTP 302だけで保護の完全性や全URLの保護を断定しない。

いずれかが不成立・結果不明なら、直ちに後続検証を停止する。
未認証でサイト本文・画像が取得できた場合は、Production URLをOFFへ戻す対応を優先し、
復旧操作に必要な独立した承認を求める。Preview URLは有効化しない。
negativeモード、Secret・Rate Limiterの設定、実Siteverifyへ進まず、自動再デプロイもしない。
問題の内容と現在状態を報告し、人間の判断を待つ。

現在のDeliveryGuardのnamespace・クラス・固定試験枠を参照しないため、異常系から消費できない。
将来のDO実環境試験は本Workerへ足さず、既存枠と分離した方法を再設計・承認する。
独立メール検証の永続ロックは確認・解除・再利用しない。
トークン・Secret・Cookie・認証ヘッダー・入力内容をログ、チャット、HAR、Gitへ記録しない。
今回の実装はCONTACT実送信・Cloudflare実環境の認証・Rate Limiter試験の成功を意味しない。
実装済みは隔離コード、未完成のnegative設定、専用buildとローカルモック検証。
safe初期導入・Accessの過去の確認と、未実施のnegative配置・実認証を区別する。

## 公開Site Key候補のローカル検査（配置処理ではない）

`site-key-candidate.mjs`は、呼び出し元が明示的に渡した公開Site Key・固定Origin・safeの39ファイルを
メモリ内で検査・複製する。ファイル読み書き、環境変数参照、ログ、通信、子プロセス、Wrangler依存はない。
変更はCONTACT HTMLと生成版JSだけで、残り37件を維持する。キー値はCONTACTのdata-sitekeyだけに入り、
JSには埋め込まない。専用HTTPS Origin・hostname・専用属性が一致した場合だけwidgetを初期化する。
生成版JSは誤200でも成功表示・generate_leadへ進まず、503等の失敗時にも入力とトークンの既存処理を維持する。
フロントのOrigin検査は補助策であり、サーバーのOrigin・Siteverify検査の代替ではない。

公式テストキー限定のpreview.mjsは変更しない。候補検査側は公式テストキーを拒否する。
候補キーの形式は既存プロジェクトに合わせた保守的な`0x`＋英数字・underscore・hyphen20〜30文字とし、
空白・改行・引用符・不正型等を拒否する。将来形式が変われば、黙って許可せず再レビューする。
Site Keyは公開用でありSecretではない。将来配信するHTMLから閲覧可能になる。
実Secretを受け取る設定や処理は実装しない。ただし、文字列の形式だけではwidget所属・発行済みであることや、
同じ形式の値がSecretではないことを証明できない。本人がDashboardでSite Key欄、widget名、専用hostname、
Managed・Pre-clearance OFFを照合する工程が別途必要で、形式合格を実認証成功とは扱わない。

`verify-site-key-local.mjs`は直接CLI実行した場合だけ`NEGATIVE_TURNSTILE_SITE_KEY`を読む。
引数によるキー入力は禁止。元の配信ファイルを読み、候補39件をメモリ内だけで検査して破棄する。
値・HTML・スタックを表示せず、成功分類／失敗分類と終了コードだけを返す。
import・再importでは環境変数を読まず、検査・通信・書き込みを開始しない。
候補を書き出すAPI・CLIオプション、サーバー、実SDK接続、配置用hookとの接続は設けない。
ただしBufferを扱える操作者が別コードで保存する行為までは防止できない。候補を配信アセットへ転用しない。

実Site Keyは今回使用していない。テストは未発行の形式検査用合成値とモックSDK・モックAPIだけを使う。
合成値を実SDK・実Siteverifyへ渡してはいけない。実SDK・実Siteverify・実Rate Limiterは未検証。
実Email・DO・Service能力を追加せず、DeliveryGuardや独立メール検証の固定ロックへアクセスしない。
negativeの無条件停止hook・無効entrypointはそのまま。キー検査成功は配置許可にならない。
Cloudflare上のsafe配置は変更しない。

### 将来、本人が別承認後に入力する場合

本人のローカルzshで、端末録画・入力記録・shell traceを停止したうえで、値をコマンドへ直書きせず入力する。
以下は将来用手順であり、今回実キーでは実行しない。

```sh
read -rs 'NEGATIVE_TURNSTILE_SITE_KEY?公開Site Keyを入力: '
export NEGATIVE_TURNSTILE_SITE_KEY
node scripts/contact-negative/verify-site-key-local.mjs
unset NEGATIVE_TURNSTILE_SITE_KEY
```

成功・失敗にかかわらずunsetし、Ctrl+C等の中断時にも残存を確認する。Secretは入力しない。
キー値をログ・ファイル・チャット・テスト結果へ保存しない。環境変数は子プロセスに継承されるため、
設定中は他のコマンドを実行しない。このCLI自身は子プロセスを起動しない。
環境変数でも同一権限プロセス、OS診断、端末・クリップボード記録から完全に秘匿できるとは保証しない。
実キー入力・検査、Git保存、Secret登録、配置禁止解除・配置反映はそれぞれ別承認とする。
まず合成値のローカル検証、独立安全監査を完了する。今回それらの実環境操作は行わない。
