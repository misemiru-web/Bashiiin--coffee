# Staging Turnstile：ローカルSiteverify・Worker実環境QA

## 目的・記録の根拠

Stagingで取得した実Turnstileトークンを既存ローカルCLIで検証し、正常認証、hostname・action照合、同一トークンの再利用拒否を確認する。

本書は、STEP 09-C3⑥-Fと⑧-Bでユーザーが提供した実施結果を記録したもの。実施者はユーザーであり、記録作業でCodexが実Siteverifyを再実行したものではない。Secret・トークン・生レスポンス・認証Cookie・クリップボード内容は収集していない。

## ローカル実Siteverify検証の日時・環境

| 項目 | 内容 |
|---|---|
| 実施日 | 2026年10月31日。実行時刻は未提供 |
| 実施環境 | ユーザーのMac、ローカルターミナルの既存CLI |
| branch・検証対象ソース | `formal-production` / `adebaceddba489d030a48e4b4dfdebb4afb5f0ae` |
| CLI | [`scripts/verify-turnstile-local.mjs`](../../scripts/verify-turnstile-local.mjs) |
| 再利用した検証処理 | [`worker/contact/turnstile.mjs`](../../worker/contact/turnstile.mjs) の `verifyTurnstile()` |
| Staging Worker | `bashiiin-coffee-staging` |
| 期待hostname | `bashiiin-coffee-staging.misemiruweb.workers.dev` |
| 期待action | `contact` |
| Access | All traffic。ユーザー報告では変更なし |
| CONTACT API・メール | いずれも無効を維持 |

CLIはCONTACT API・メール処理・Wranglerを起動せず、ローカルから公式Siteverifyへ検証リクエストを送る。ローカルでの実通信検証と、Worker上での検証・問い合わせ送信は別である。

## 実施済み：初回の実Siteverify

ユーザーから報告された、安全なCLI判定出力：

```text
PASS hostname=MATCH action=MATCH type=VERIFIED
```

- 実Siteverify通信が成功した。
- ユーザーが保管する実Secret Keyと実トークンによる検証が成功した。
- 応答のhostnameは期待するStaging hostnameと一致した。
- 応答のactionは `contact` と一致した。

これは認証検証の成功であり、CONTACT送信成功やメール到達の証明ではない。

## 実施済み：同一トークンの再利用拒否

ユーザーから報告された判定出力：

```text
PASS hostname=MATCH action=MATCH type=VERIFIED
REPLAY PASS hostname=MATCH action=MATCH type=TIMEOUT_OR_DUPLICATE
```

- 試験の初回認証が成功した。
- その成功した同一トークンを意図的に再検証し、再利用が拒否された。
- `REPLAY PASS` は「再利用拒否試験の成功」であり、再認証成功やトークンの再使用許可を意味しない。
- 再利用試験の明示的な2回目の検証と、通信失敗後の自動リトライは区別する。ユーザー報告では、不正な再送信・自動リトライはなかった。
- `TIMEOUT_OR_DUPLICATE` は期限切れにも使われる判定である。本試験は成功済みトークンの再使用を確認したもので、期限切れの独立した実検証とは扱わない。

## 検証後の状態（ユーザー報告）

- クリップボードは消去済み。内容は記録しない。
- CONTACT API・メール送信は無効を維持。
- Cloudflare Accessの変更なし。
- Worker Secretは未登録。
- 実メール送信なし。

## 未実施・モックとの区別

| 項目 | 現在の確認範囲 |
|---|---|
| 正常な実トークン・hostname・action一致 | ユーザーによるローカル実Siteverifyで確認済み |
| 同一トークン再利用の拒否 | ユーザーによるローカル実Siteverifyで確認済み |
| 未使用トークンの期限切れ拒否 | 独立した実検証は未実施。既存テストではモックで確認 |
| 不正トークン、hostname・action不一致 | 実サービスでの独立検証は本報告に含まれない。既存テストではモックで確認 |
| 通信障害・タイムアウト・HTTP／JSON異常 | 実サービスでの障害試験は未実施。既存テストではモックで確認 |
| 非表示TTY入力・端末復元・安全な出力 | 前工程のCLI自動テスト・合成データによる疑似端末試験で確認。実通信結果と混同しない |
| Worker上のSecret binding・外向き通信 | 未検証。Worker Secretは未登録 |
| Workerのレート制限binding・実環境動作 | 未検証 |
| CONTACTフォームからの送信・実メール受付／到達 | 未検証。フォーム・API・メールは無効のまま |

STEP 09-C3⑥-F記録時点では、既存171件とCLI41件、計212件の自動テストが通過していた。その後のworkerd互換性修正では、ローカルWorker統合44件・回帰220件・CLIモック10ケースが成功している。これらは実サービスの認証・メール受付ではなく、合成データとモックを使った結果である。今回のQA文書更新ではコード変更・テスト再実行・実認証再実行は行わない。

## STEP 09-C3⑧-B：互換性修正後のStaging実環境確認

2026年10月31日の本記録更新に際してユーザーが提示した確認済み事実。実環境確認の正確な実行日時・ブラウザーバージョンは未提供であり、推測しない。Codexは今回、Stagingへの接続・ヘッダー取得・POST・デプロイを再実行していない。

| 項目 | ユーザー確認結果 |
|---|---|
| Worker | `bashiiin-coffee-staging` |
| 確認時の稼働バージョン | `48b6b2c4-a1a3-4536-ad0c-1fee843df3d5` |
| Cloudflare Access | All traffic、only me |
| 未認証のCONTACTアクセス | HTTP 302。認証済みページの表示確認とは区別する |
| 認証済みCONTACTページ | 正常表示 |
| 実Turnstileウィジェット | 認証成功 |
| 認証成功後の送信ボタン | disabledを維持 |
| `POST /api/contact` | HTTP 503 |
| `CONTACT_API_ENABLED` | 文字列 `"false"` |
| `EMAIL_SENDING_ENABLED` | 文字列 `"false"` |
| Worker Secret | 未登録 |

ウィジェットの認証成功は、Worker上のSiteverify成功を意味しない。現在のAPIは設定ガードでSiteverify・メール処理より前に拒否する設計であり、今回の503確認を、Workerから実Siteverifyへ到達した証拠として扱わない。メール通知・到達、レート制限、Worker Secret bindingと実認証は引き続き未検証である。

この稼働バージョン情報はユーザーの報告を記録したもので、今回の文書保存によってCloudflareへ配置・反映したものではない。

## 未解決事項：Turnstile関連CSPエラー

STEP 09-C3⑧-Bで、ユーザーがブラウザーからCONTACTページ本体を調査した結果：

| 調査対象 | 確認結果 |
|---|---|
| `Content-Security-Policy` レスポンスヘッダー | なし |
| `Content-Security-Policy-Report-Only` レスポンスヘッダー | なし |
| CSP metaタグ | なし |
| TurnstileコンソールのCSP関連エラー | あり |
| 表示されたエラー発生元 | `flexible?lang=auto:1` |

**判定：機能動作に現時点で支障なし・原因未確定・継続監視。** この機能評価は、今回確認されたCONTACT表示・ウィジェット認証・disabled維持・API拒否の範囲に限る。フォーム送信・実メールなど未有効化の機能を保証するものではない。

Turnstile内部iframe由来の可能性はあるが、原因・実際のポリシー発行元を断定しない。CONTACTページ本体にCSP指定がないという結果を、内部iframeにもCSPがないという証拠として扱わない。対象directive・拒否リソース・再現条件の切り分けは未完了である。

CSPを緩和する修正やセキュリティヘッダーの削除は実施しない。認証成功だけでエラー解消済みとは判断せず、再発・認証失敗・表示不良の有無を継続監視する。追加調査ではSecret・トークン・Cookie・個人情報・生レスポンスを保存せず、安全に伏せた情報だけを扱う。

## 次工程の確認項目

1. CSPエラーの再現条件・対象directive・機能への影響を、安全な情報だけで調査する。設定緩和は別途レビュー・承認する。
2. 必要に応じ、未使用トークンの期限切れを独立して実検証する。実トークン取得・実通信は別途許可を得る。
3. 別途承認後、Staging限定のWorker Secret bindingと実環境からのSiteverifyを確認する。ローカル成功をWorker上の設定完了と扱わない。
4. レート制限、固定送信元／宛先、メールbinding、重複通知方針を確認する。API・メールの有効化や実送信は別工程とする。
5. フォーム有効化・実メール受付／到達・公開前QA・店舗承認を別途確認する。全ページのnoindexを維持する。

## 記録工程の制約

STEP 09-C3⑥-Fの作成工程および⑧-Bの更新工程は、このQA文書1件とGit保存だけを対象とする。実キー・実トークンの取得／入力、実Siteverify再実行、Cloudflare設定変更、Secret登録、デプロイ、実メール送信、CONTACT有効化は実施しない。既存ソース・main・元の未追跡47件を変更せず、機密情報を文書・ログ・Git履歴へ追加しない。
