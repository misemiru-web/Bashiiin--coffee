# CONTACT異常系専用Worker：初期safe導入QA

## 目的・記録の根拠

2026年11月1日に実施したCONTACT異常系専用Workerの非公開初回safeデプロイと、
その後のAccess保護・Production URL有効化・初期安全検証の結果を記録する。
negativeモードの導入、実認証・実メール送信、正式公開の受入完了を意味しない。

- 初回デプロイとその直後の管理API確認は、STEP 09-C3⑨-AM④-再開でCodexが実施した結果に基づく。
- Access設定・URL有効化・未認証HTTP・認証済みChromeの結果は、STEP 09-C3⑨-ANでユーザーから提供された確認結果に基づく。
- 本書の作成日は2026年11月1日。各試験の正確な実行時刻は、確認済みのプラン確認時刻を除き記録していない。
- 記録開始時のGitは`formal-production` / `328e9ebe0be38b292f496add08a1083369678ea2`。
- 今回の文書作成ではCloudflareに接続せず、既存Workerを含む最新状態を再取得していない。
  Dashboard操作、HTTP検証、デプロイ、実Siteverify、実メール送信を再実行していない。

## 1. 非公開初回safeデプロイ（前工程の実施結果）

| 項目 | 確認結果 |
|---|---|
| Worker | `bashiiin-coffee-contact-negative` |
| Version ID | `b38bb83f-e959-4763-a444-072da5404f28` |
| 初回デプロイ | 1回で成功、終了コード0 |
| 配置率 | 新Versionを100%配置 |
| Wrangler | 固定版4.154.0 |
| 使用設定 | `scripts/contact-negative/wrangler.safe.jsonc`の検証済み一時コピー |
| アセット | 許可リストの39ファイル |
| E2E_MODE | 文字列`"safe"` |
| CONTACT_API_ENABLED | 文字列`"false"` |
| EMAIL_SENDING_ENABLED | 文字列`"false"` |
| 実Email・RAW_EMAIL・DO・Service binding | なし。ASSETSと上記の非Secret変数のみ |
| Secret・DO migration | なし |
| Production URL | 初回配置時OFF |
| Preview／Version URL | OFF |
| Custom Domain・Routes・Cron | なし |

初回デプロイ時の公開経路無効状態・bindings・配置率は、その直後に管理APIで確認した。
Accessの適用とProduction URL有効化は、初回配置とは別の後続操作である。

### Workers Freeの確認根拠

ユーザーが2026年11月1日03:03 JSTに、対象と同じCloudflareアカウントのDashboard「Workers plans」で
Free：$0、Free欄：Current plan、Paid欄：Upgradeを直接確認した。
CLI認証先は、既存Staging・E2E Workerと同じ照合済みアカウントであることを前工程で確認した。
プラン取得APIはHTTP 403で取得失敗だったため、Freeの根拠にはしていない。
`default_usage_model: standard`だけでFreeと判断したものでもない。

## 2. Accessを先に適用してからProduction URLを有効化（ユーザー確認）

確認された操作順序は以下のとおり。**Access適用前にはProduction URLを有効化していない。**

1. 公開URLなしで初回safeデプロイを完了。
2. 対象WorkerのAccess設定画面を確認。
3. ScopeをAll trafficとして確認。
4. Policyを`misemiru-ops - only me`として確認。
5. ActionをAllowとして確認。
6. 許可メールを`misemiruweb@gmail.com`（管理者1名）として確認。
7. Session durationを24 hoursとして確認。
8. Apply Accessを実行。
9. Access適用済みのDashboard表示を確認。
10. 当該WorkerのProduction URLをON。
11. Preview URLはOFFを維持。
12. Production URLへのAccessポリシー適用表示を確認。

初回配置時のProduction URL OFFと、Access適用後のONは時点を区別する。
初回用safe設定は`workers_dev: false`、`preview_urls: false`のまま変更していない。
将来の再配置・safe復旧では、現在のProduction URL・Access設定との整合性を別途確認し、
初回用設定を無条件に再デプロイしない。

## 3. 未認証アクセス（ユーザー実行結果）

対象origin：`https://bashiiin-coffee-contact-negative.misemiruweb.workers.dev`

| リクエスト | HTTPステータス | Locationの追加確認 |
|---|---|---|
| `GET /` | 302 | 今回の提供結果では個別確認なし |
| `GET /contact/` | 302 | Cloudflare Accessへの転送を確認 |
| `GET /styles.css` | 302 | 今回の提供結果では個別確認なし |
| `GET /api/contact` | 302 | 今回の提供結果では個別確認なし |
| `GET /images/web/logo-header.png` | 302 | Cloudflare Accessへの転送を確認 |

HTTP 302だけで全URL・全認証条件の保護を証明したとは扱わない。
Locationの具体的な認証URLや認証用パラメータは保存しない。
画像は実ファイル`logo-header.png`の1件を確認したものであり、画像全件や全39ファイルの網羅検証ではない。

## 4. 認証済みCONTACT（ユーザーのChrome確認）

| 項目 | 確認結果 |
|---|---|
| CONTACTページ | 正常表示 |
| 案内文 | 「現在、送信機能は準備中です。」 |
| お問い合わせフォーム | 正常表示 |
| 送信ボタン | あり |
| submitButtonDisabled | `true` |
| robots | `noindex, nofollow, noarchive` |
| noindex | `true` |

認証済みブラウザーから本文`{}`を`POST /api/contact`へ送信した結果：

| 項目 | 結果 |
|---|---|
| HTTPステータス | 503 |
| ok | `false` |
| response type | `basic` |

これはsafeモードの期待される拒否動作であり、実メール受付成功、Turnstile検証成功、
Rate Limiter検証成功を示さない。初期safe設定ではSiteverify・メール処理より前に拒否する。
既存DeliveryGuardの試行枠が消費されたという検証でもない。

## 5. 既存環境の保護

- 既存Staging：今回の文書作成では変更していない。
- 既存E2E Worker：今回の文書作成では変更していない。
- DeliveryGuard：今回操作していない。
- 独立メール検証用固定ロック：今回操作・解除・再利用していない。
- main：今回変更していない。
- 初回デプロイ直後の前工程では既存2 Workerの不変を確認したが、今回その最新状態を再取得したものではない。
- 元の未追跡47件と既存追跡済み214ファイルを保全し、今回の変更は本QA文書の新規作成だけに限定する。

## 6. 未検証事項・次工程

以下は本異常系Workerの実環境で成功済みとは扱わない。

- 実Turnstile Siteverify。
- 有効トークンの単回使用・再利用拒否・期限切れ拒否の実環境試験。
- 実Rate Limiterによる429応答。
- 異常系negativeモードの実環境配置。
- 全39ファイルそれぞれのAccess保護。
- 全認証条件・バイパス経路の網羅的な保護検証。
- 異常系Workerでのメール送信経路の実環境検証。
- 既存DeliveryGuardの競合制御・実永続化。

本Workerは実メール送信能力を持たない設計であり、上記の未検証項目はEmail binding追加や実送信の許可を意味しない。
過去の独立Email Service単独送信の受付・Gmail到達成功や、ローカルCLI実Siteverify成功を、
本WorkerのCONTACT試験成功へ読み替えない。

`wrangler.negative.jsonc`はnamespace ID等が未確定の未完成設定で、デプロイ可能との判定ではない。
次工程では専用widget・Secret、31001と分離したRate Limiter namespaceの確認、設定確定、
Production URL・Accessと復旧設定の整合性、ローカル再検証を行い、各実環境変更とnegativeモード配置には別途承認を得る。
実Siteverify・実Rate Limiter試験も独立した承認工程とし、失敗・タイムアウト・結果不明時は自動再試験・再デプロイしない。
Secret・トークン・Cookie・認証ヘッダー・認証URL・生レスポンスをQAやGitへ保存しない。
