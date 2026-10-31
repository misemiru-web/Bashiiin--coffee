# CONTACT専用E2E Worker：初期導入QA

## 目的・記録の根拠

2026年10月31日に実施された専用CONTACT E2E Workerの非公開初回デプロイと、
その後のAccess保護・Production URL有効化・初期安全モードの確認結果を記録する。
正式公開やCONTACT実送信の受入完了を意味しない。

- 初回デプロイ結果は、STEP 09-C3⑨-AG③-EでCodexが実行した固定Wrangler 4.154.0のdeployと、
  その直後の管理API読み取り確認に基づく。
- Access・Production URL・未認証HTTP・認証済みChromeの結果は、STEP 09-C3⑨-AHでユーザーが提示した確認結果に基づく。
- 実施日は2026年10月31日。各確認の正確な実行時刻は本書では記録していない。
- 本文書の作成時には、Cloudflareの最新状態を再取得していない。
  HTTPリクエスト、ブラウザー操作、追加デプロイ、設定変更、実認証、メール送信は再実行していない。
- 記録開始時のソースは`formal-production` / `e03819e9af42ffa5094ab838c00b19424d79eab9`。

## 1. 非公開初回デプロイ（Codexによる前工程の確認）

| 項目 | 確認結果 |
|---|---|
| Worker名 | `bashiiin-coffee-contact-e2e` |
| Version ID | `687af4ac-6354-48ba-b159-68b0fff091f0` |
| 配置結果 | 新規デプロイ成功、新バージョン100%稼働を報告済み |
| アセット | 許可リストの39ファイルをアップロード |
| 初回migration | `e2e-sqlite-v1` |
| Durable Objectクラス | `DeliveryGuard` |
| DO binding | `DELIVERY_GUARD` |
| DO namespace | 専用のSQLite-backed namespace登録成功 |
| E2E_MODE | `safe` |
| CONTACT_API_ENABLED | 文字列`"false"` |
| EMAIL_SENDING_ENABLED | 文字列`"false"` |
| 実Email binding・Turnstile Secret | 未設定 |
| Routes・Custom Domain・Cron | なし |
| 初回配置直後のURL | 管理APIでworkers.dev無効、Preview／Version URL無効を確認済み |

初回deployは1回だけ実施され、終了コード0だった。初回配置時点ではAccessの設定やURL有効化を行っていない。
namespace登録は、メール送信枠の消費、実永続化・競合制御の動作確認を意味しない。

## 2. Accessを先に適用し、その後Production URLを有効化（ユーザー確認）

ユーザーはDashboardで専用WorkerへのAccess適用を確認してから、Production URLをONにした。
URLを先に有効化してからAccessを設定した手順ではない。

| 項目 | Dashboardでのユーザー確認結果 |
|---|---|
| 保護対象 | 専用Worker `bashiiin-coffee-contact-e2e` |
| Scope | All traffic |
| 認証ポリシー | `misemiru-ops - only me` |
| 許可ユーザー | `misemiruweb@gmail.com`（指定された管理者1名） |
| Production URL | Access適用確認後にON |
| Preview URL | OFFを維持 |
| Custom Domains・Routes | なし |
| Production URL欄 | Access適用表示あり |

初回配置時のURL無効状態と、上記の後続操作後の状態は時点を分けて扱う。
本書はユーザー確認の履歴であり、記録時点の最新設定をCodexが再検証したものではない。
ローカルの`wrangler.safe.jsonc`は初回配置用の非公開設定のままであり、今回変更していない。
将来再配置する場合はDashboard側のURL設定との整合性を別途確認する必要がある。

## 3. 未認証アクセス（ユーザー報告）

| 対象 | リクエスト | 結果 |
|---|---|---|
| 専用E2E Worker | `GET /` | HTTP 302 |
| 専用E2E Worker | `GET /contact/` | HTTP 302 |
| 専用E2E Worker | `GET /styles.css` | HTTP 302 |
| 専用E2E Worker | `GET /api/contact` | HTTP 302 |
| 既存Staging | `GET /contact/` | HTTP 302 |

これは未認証アクセスに対するリダイレクト結果であり、Worker APIの認証済み応答とは区別する。
**HTTP 302だけでは、リダイレクト先や全URL・全認証条件の保護を厳密に証明したことにはならない。**
今回提示された結果を超えるリダイレクト先・画像URL・別URL経路等の網羅検証を、実施済みとは扱わない。

## 4. 認証済みCONTACT（ユーザーのChrome確認）

| 項目 | 確認結果 |
|---|---|
| CONTACTページ | 正常表示 |
| 案内文 | 「現在、送信機能は準備中です。」 |
| 送信ボタン | あり |
| submitButtonDisabled | `true` |
| robots | `noindex, nofollow, noarchive` |
| noindex | `true` |

認証済みブラウザーから、JSONの`{}`を`POST /api/contact`へ送信した結果：

| 項目 | 結果 |
|---|---|
| HTTPステータス | 503 |
| ok | `false` |
| response type | `basic` |

この503は、初期安全モードによる想定された拒否結果である。
送信成功・実Siteverify成功・DO送信枠消費・実メール受付の証拠ではない。
現行実装は、両フラグ無効時にSiteverify・メール処理へ進む前に拒否する構成である。
今回の確認で、実メール送信、Turnstile Siteverify、DO送信枠消費が実行されたとは記録しない。

## 5. 未検証事項・別試験との区別

以下は専用E2E Workerの実環境では未検証である。

- 実Turnstile Siteverifyと、実トークンの再利用拒否。
- Rate Limiterの実環境動作。
- Durable Objectの実永続化・競合制御。
- CONTACT E2Eからの実メール受付・Gmail到達。
- 異常系モードのCloudflare実環境検証。
- 全関連バックグラウンド処理の終了保証。
- 厳密なexactly-once配送保証。
- 全URL・全認証条件を網羅したAccess保護検証。

過去のローカルモック試験や、既存Stagingに対応するローカルCLI実Siteverifyの成功を、
専用Worker上の実認証成功へ読み替えない。
独立Email Serviceハーネスでは、サービス受付・Gmail到達が確認されているが、
それは本CONTACT E2Eからの送信成功とは別である。
過去の独立試験結果は[既存QA記録](staging-turnstile-siteverify-2026-10-31.md)を参照する。

## 6. 保持する安全条件・次工程

- 専用Workerはsafe・両送信フラグ無効を維持する。実Email binding・Turnstile Secretは未設定。
- 独立Email検証用の永続ロックは保持し、解除・変更・再利用しない。
- DO namespaceの削除・リセット・過去への復元で送信枠を再発行しない。
- 異常系モード、専用widget・Secret、独立Rate Limiter、DO実環境試験は別途承認工程とする。
- 実メールbinding追加・フォーム有効化・正常系1通の実送信には独立した承認が必要。
- 今回の作業範囲はこのQA文書の作成・GitHub保存のみ。既存QA・コード・設定を変更しない。
- 本記録を、正式公開・CONTACT送信機能の有効化承認として扱わない。
