# Staging Turnstile：ローカルCLIによる実Siteverify QA

## 目的・記録の根拠

Stagingで取得した実Turnstileトークンを既存ローカルCLIで検証し、正常認証、hostname・action照合、同一トークンの再利用拒否を確認する。

本書は、STEP 09-C3⑥-Fでユーザーが提供した実施結果を記録したもの。実施者はユーザーであり、記録作業でCodexが実Siteverifyを再実行したものではない。Secret・トークン・生レスポンス・認証Cookie・クリップボード内容は収集していない。

## 検証日時・環境

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

前工程では既存171件とCLI41件、計212件の自動テストが通過している。本QA記録作成工程ではコード変更・自動テスト再実行・実認証再実行は行わない。

## 未解決事項：Turnstile関連CSPエラー

ユーザーから、以前のブラウザー検証でTurnstile関連CSPエラーが確認されているとの報告がある。原因は未確定。対象directive、拒否されたリソース、発生条件、ウィジェットへの影響は追加確認が必要であり、本書で原因や解消を断定しない。

ウィジェット認証や今回のローカルSiteverifyが成功したことだけで、ブラウザー側CSPエラーが解消済みとは判断しない。機密情報を含むログ・Cookie・トークンを収集せず、安全に伏せた情報で切り分ける。

## 次工程の確認項目

1. CSPエラーの再現条件・対象directive・機能への影響を、安全な情報だけで調査する。設定緩和は別途レビュー・承認する。
2. 必要に応じ、未使用トークンの期限切れを独立して実検証する。実トークン取得・実通信は別途許可を得る。
3. 別途承認後、Staging限定のWorker Secret bindingと実環境からのSiteverifyを確認する。ローカル成功をWorker上の設定完了と扱わない。
4. レート制限、固定送信元／宛先、メールbinding、重複通知方針を確認する。API・メールの有効化や実送信は別工程とする。
5. フォーム有効化・実メール受付／到達・公開前QA・店舗承認を別途確認する。全ページのnoindexを維持する。

## 記録工程の制約

本工程はこのQA文書1件の作成とGit保存だけを対象とする。実キー・実トークンの取得／入力、実Siteverify再実行、Cloudflare設定変更、Secret登録、デプロイ、実メール送信、CONTACT有効化は実施しない。既存ソース・main・元の未追跡47件を変更せず、機密情報を文書・ログ・Git履歴へ追加しない。
