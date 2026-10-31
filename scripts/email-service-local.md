# Email Service単独検証CLI（配信対象外）

通常実行は `node scripts/email-service-local.mjs`。モック受付だけで、Wrangler読込・認証・remote接続・メール送信は行わない。
モックにも一時領域の実ロックが必須。通常実行は専用の一時ディレクトリを作成し、成功・失敗後もロックを残す。実送信用固定パスには触れない。
テストは `node --test scripts/email-service-local.test.mjs`。既存269件は別に `npm test` で実行する。依存追加なし。
ローカルランタイム互換性は `node scripts/email-service-runtime-check.mjs` で確認する。外向きNode HTTPを遮断し、remote接続を無効化した状態でbindingの存在だけを検査する。送信は呼ばない。

## 将来の実送信（別途承認が必要。今回未実行）

`node scripts/email-service-local.mjs --live` はTTYでのAccount ID入力と固定送信元・固定宛先への `SEND ONE` 確認を必須にする。
Account IDはDashboardで対象を照合したものだけを使う。キーやトークンを入力しない。
非公開のlive実装が固定Wranglerの `whoami --json` を内部で実行し、その認証済みアカウント一覧と照合する。`email-service-remote.mjs`は副作用のないアカウント照合関数だけを公開し、transportや送信経路は持たない。
CLIはログインコマンドを実行しない。CIモードで認証不足は停止する。OAuth期限更新などの認証通信は生じ得るため、起動自体に承認が必要。
認証メタデータは出力しない。実処理中だけ環境を許可リストへ限定してAPI Token・Secret・Node実行フックを除外し、終了・例外時に復元する。既存Wranglerの認証情報を利用する。

専用の `wrangler.email-test.jsonc` は通常 `remote: false`。直接実行されたCLIで全認可条件を満たした場合だけ、一時ディレクトリへAccount ID付きの `remote: true` 設定を生成する。main・live実装・transport factoryはexportしない。IPC経路もない。importしても何も起動しない。
固定Wrangler 4.154.0の `getPlatformProxy()` 実装はEmail bindingを含めて構築し、remote sessionを返す。HTTPハンドラー・公開URL・Cron・watchは用いない。
このAPIはNode.js用。前工程でremote無効の実ランタイムによるEmail binding存在確認を行った。今回の修正版ではモックによる起動・環境復元を確認する。実remote互換性・認証・送信成功は別途未検証。

送信は既存 `sendNotification()` を再利用する。内容・送信元・宛先は固定し、設定全体も許可した形と完全一致させる。宛先bindingは1件固定。
`email-service-local.mjs`の非公開領域に、プロセス共通の単一ゲート・ロック取得・permit管理・唯一の送信関数を集約する。認可済みの処理が、認証・remote起動・送信の最初の非同期処理より前にゲートを消費して実ロックを取得する。リセット機構はない。
permitは実際の排他作成・所有者/権限/inode検査・fsync成功後にだけ生成し、非公開WeakMapへ格納する。ロックのファイル記述子はセッション終了まで保持し、送信直前にディレクトリ・ファイル・保持FDの実体を照合する。存在確認だけで許可せず、`state.remote`による例外も設けない。
送信関数・senderOnce・sendReserved・grant発行・任意bindingの受付は外部公開しない。引数・環境変数・模擬booleanによってpermitを作れない。並行・逐次・失敗・タイムアウト・設定拒否・キャンセル後も再送しない。
5秒の受付待ちタイムアウト後にも送信が完了する可能性がある。`UNKNOWN_OR_REJECTED` は未送信の証明ではない。
1起動につき呼び出し最大1回。下記の永続ロックで、同じOSユーザーによる別プロセス・プロセス再起動後の試行も拒否する。配送側の厳密なexactly-onceは保証しない。

Wranglerの出力・ファイルログは抑制し、生エラー・receipt・認証情報は出力しない。終了時はsession/workerdをdisposeし、一時設定を削除して環境を復元する。中断時は以降の送信を拒否し、開いているモックセッションのdisposeを検証する。実remoteセッションでの終了・復旧動作は未検証。
中断時も終了処理を行うが、SIGKILLやOS障害まで後片付けを保証しない。異常終了時はプロセス・一時リソースを確認し、受付/受信状況の確認前に再送しない。

## importと検証時の隔離

local・runtime-check・remoteモジュールはimport時に環境変更・プロセス起動・通信・ファイル変更を行わない。
runtime-checkは明示的な関数呼び出し、またはES Modulesの直接実行判定を通った場合だけ動作する。環境変数・fetch・HTTP dispatcherは正常終了・例外時とも復元する。
旧79件の観点を、低レベルAPIの非公開化に合わせて移植・拡充する。ケースごとに別のNodeプロセスで実行し、テスト用リセットや環境変数による本体ガード回避は追加しない。
公開モックAPIは `runMock({root, scenario})`だけ。rootは既存のユーザー所有0700の専用一時ディレクトリ、scenarioは定義済みの合成応答に限定する。root未指定時は内部で一時領域を生成する。binding・state・grant・ロックコールバック・transport factory・任意メール内容の注入は拒否する。
模擬bindingは本体の非公開領域で生成する。テスト関数から実bindingを渡せず、mock APIからWrangler・認証・live transportを取得できない。send()内で増加する実際の呼び出しカウンターを検証する。
lock-removed/lock-replaced等の故障シナリオは、当該セッションが作成した一時ロックだけを改変し、送信直前の実体照合で拒否されることを検証する。実送信用の固定パスは対象にできない。CLIの実live接続は実行しない。

## 永続ロック：別プロセス・プロセス再起動の排他

live側の固定保存先は、OSアカウント情報`os.userInfo().homedir`直下の`.bashiiin-email-verification/delivery.lock`。
`HOME`・CLI引数・環境変数では変更できない。ディレクトリは現在ユーザー所有・0700、ロックは0600。親パスを含むシンボリックリンクや不適切な所有者・権限は拒否し、自動で権限修正しない。
`wx`相当の`O_CREAT | O_EXCL | O_WRONLY`に`O_NOFOLLOW`を加えて原子的に作成する。ディレクトリとファイルの実体・inodeを照合し、ファイルとディレクトリをfsyncする。失敗・既存ロックは送信せず停止する。
共有ゲートを消費してからロックを取得し、その後に認証・remote接続へ進む。`--live`・TTY・Account ID照合・`SEND ONE`確認を省略する経路ではない。
ロックを取得しただけではメールは送られない。通常のモックCLIは一時領域のロックだけを取得し、実送信用固定ロック・remote接続には触れない。

ロックは成功・失敗・タイムアウト・中断・異常終了後も保持する。認証設定不足など、送信前の失敗でも取得済みロックは保持する。
記録内容は形式バージョン・用途・ランダム試験ID・PID・作成日時のみ。アカウントID・メール本文・認証情報は保存しない。期限やPID消滅を理由に自動削除しない。空・部分書き込みのロックも再送を拒否する。
テストは一時ディレクトリの同じ非公開ロック・送信処理と内蔵mock transportだけを使う。live固定パスは呼び出さない。テスト後に削除するのは自分で作成した一時fixtureだけであり、liveロックの自動解除処理はない。

### 人間による解除手順（今回未実行）

1. 同じOSユーザーの検証プロセスがすべて停止していることを確認する。PIDだけでなく実行状態を照合する。
2. サービスの受付状態とGmailの受信箱・迷惑メールを確認する。タイムアウト・不明な受付結果は未送信の証明ではない。確認できなければロックを保持する。
3. 重複通知の可能性を確認し、新しい試験1回を実施する明示承認を得る。
4. `node -p "require('node:os').userInfo().homedir"`でOSホームを確認し、Finderの「フォルダへ移動」で、そのホーム直下の`.bashiiin-email-verification`を開く。値を別の保存先へ読み替えない。
5. ディレクトリ・通常ファイル`delivery.lock`の所有者と権限、試験IDを確認する。シンボリックリンクや想定外の状態なら操作せず停止する。
6. 承認された人間が`delivery.lock`一件だけをFinderから削除する。一括削除・自動解除・ディレクトリやDNS/Cloudflare設定の削除は行わない。解除と再試験の判断をQAに記録する。

### 残余リスク

この排他は同じ端末・同じOSユーザー・同じローカルファイルシステムに限る。運用は端末1台・OSユーザー1名に限定する。別端末・別OSユーザーでの同時実行を防ぐには別の共有排他設計が必要。
OS再起動の実試験・停電時の耐久性は未検証。fsyncを使用してもディスク障害・ロックの手動削除・ホームの移動やバックアップ復元を含む厳密な保証はしない。同じユーザー権限を持つ悪意あるプログラムによる差し替えまで完全には防げない。
実remote認証・メール受付/到達・中断時のリモートリソース解放は未検証であり、ローカル排他成功から実送信成功を推定しない。

## 実行前後の確認

- Email Routingのドメイン・固定宛先Verified・送信元利用可否・無料枠/権限を確認する。必要な有料契約やDNS変更を自動実施しない。
- remote session用の権限・一時リソース・接続URLの扱いを確認し、一般公開される送信経路が必要なら停止する。
- サービス受付とGmailの到達を別々に確認する。合成本文だけを使い、顧客情報を使用しない。
- Stagingの既存EMAIL bindingそのもの、CONTACT/API/Turnstile/Rate LimiterのE2E検証にはならない。
- Staging設定・両falseフラグ・Access・Secret・フォームdisabled・noindex・39公開ファイルは変更しない。
- `dist-staging/` は再生成しない。専用CLI/設定/テストは公開許可リストへ追加しない。

公式資料：
- https://developers.cloudflare.com/email-service/observability/local-development/sending/
- https://developers.cloudflare.com/workers/wrangler/api/
- https://developers.cloudflare.com/email-service/platform/pricing/
