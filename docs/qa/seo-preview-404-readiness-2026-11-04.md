# STEP SEO-05C：Cloudflare Pages 404対応・レビュー公開準備

確認日：2026-11-04（JST） / branch：`formal-production` / HEAD：`73803d88e6ea1788db3bfbb5a97318d1d18f6678`＋既存の未コミット変更

対象：[店舗レビュー用Pages](https://bashiiin-coffee-client-review.pages.dev/)。**ローカル修正・検証・新ZIP作成まで。アップロード・Deployment作成・正式公開は未実施。**

## 1. 総合判定：B

**404.html追加と40ファイル化、既存サイトの保持、通常テスト・ローカルHTTP検証・404画面の操作確認を完了。Pagesローカルでは未存在URL／GET /api/contactは404となり、TOP HTMLの200返却はなかった。ただしカスタム404本文の自動返却は同ローカルCLIで確認できず、公開Pagesの反映後確認を残す。**

Bは、既存5ページの表示崩れやパッケージの不整合によるものではない。404ドキュメント自体の表示・TOP帰還は検証済みだが、未知URLでのカスタム本文表示まで完了したとは扱わない。Git再現性の既存保留も今回確定させていない。

## 2. 404問題の修正内容

- ルートに`404.html`を新規追加。「404」「ページが見つかりません」、短い説明、`href="/"`のTOPリンクを掲載。
- 既存の`styles.css`、favicon、page-shell／page-intro／content-copy／text-link等を再利用。新しいCSS・JS・ライブラリ・写真は追加していない。
- JSを一切読み込まず、ヘッダー・開閉ナビを置かない単純なmain＋H1構成。言語ja・viewport・title・`noindex, nofollow, noarchive`を指定。見出しを短い意味単位のspanにし、モバイルで途中分断を抑えた。
- TOPリンクは同一originのルート相対。プレビュードメインへの固定や、JS専用操作はない。既存のfocus outlineと44px以上の操作域を利用。
- mainに固定高さ・大きなmin-heightを追加せず、既存page-introの上余白44〜60pxを使用。390px／1440pxの実画像を目視し、重なり・横はみ出し・説明とリンクの不自然な距離がないことを確認。
- 通常ページを表す`PAGES`は5件のまま。`ERROR_PAGES = ['404.html']`を分け、公開許可リストとHTMLの参照／robots検査の対象へ追加。エラーページを通常5ページのSEO URL一覧・sitemap候補へ混ぜていない。

[Cloudflare公式の配信仕様](https://developers.cloudflare.com/pages/configuration/serving-pages/)は、ルート404.htmlによるカスタムNot Foundと、404.htmlがない場合のSPA動作を説明する。今回の修正はその標準構成に沿う。これは公開済み環境で動作確認したという意味ではない。

## 3. 変更ファイル

| ファイル | 今回の変更 |
|---|---|
| `404.html` | 新規の静的404ページ |
| `scripts/public-files.json` | 404.htmlの1件だけ追加、39→40 |
| `scripts/build-static.mjs` | ERROR_PAGESを追加し、404も必須入力・noindex・参照チェックの対象にする |
| `scripts/build-static.test.mjs` | 404欠落時の既存成果物保護、不正なTOPリンク先、noindex解除拒否の3テストを追加 |
| `scripts/verify-local.mjs` | 404.htmlをWorkerでの正規URL `/404/`として照合。既存APIステータスの期待値は維持 |
| `scripts/build-staging.mjs` | 共通許可リストを使うため件数ガードのみ40へ |
| `scripts/build-staging.test.mjs` | 共通配信件数の期待値だけ40へ |
| `scripts/verify-turnstile-local.test.mjs` | 公開許可リスト件数の期待値だけ40へ |
| `scripts/production-seo.test.mjs` | 既存未追跡ファイル。件数assert2箇所と対応するテスト名を40へ。SEO処理・承認条件は変更なし |
| `README.md` | 現在の配信構成を40へ、Pages404／Worker APIの差と本報告の参照を追加。日付付き過去の39件検証記録は書き換えない |
| `docs/qa/seo-preview-404-readiness-2026-11-04.md` | 本報告を新規追加 |

**既存5 HTML・styles.css・script.js・写真・ロゴ・package.json・lockfile・Worker／API／Turnstile・wrangler.jsoncは開始時と同一。** 既存の文章・メタ・noindex・フォーム状態を変えていない。新しい配信ファイルは404.htmlだけ。

未追跡SEOスクリプト4件は無断Git追加しない。共通件数の検証に必要なtestファイルの上記3箇所だけを更新し、他3ファイルは同一。原本画像10点を含む全画像も同一。Git管理方針を確定したり、検証を迂回する変更はしていない。

## 4. 配信ファイル数・構成

**40ファイル：5ページHTML＋404.html＋CSS／JS 2件＋写真WebP 30件＋ロゴ／favicon PNG 2件。**

通常`npm run build`で生成し、`verify:dist`で公開許可リスト40件と再帰列挙結果が完全一致。source／dist／新ZIPの各ファイルをバイト・SHA-256で照合した。以前の39配信ファイルは、SEO-05Bで記録した全ハッシュと一致した。新規の404以外に増減や内容変更はない。

`.DS_Store`・`__MACOSX`・docs／QA・原本・未使用素材・作業入力・package.json・Wrangler／Worker・Secret設定は含まれない。ZIPはルート直下にindex.htmlと404.htmlがあり、余分な親ディレクトリを作っていない。

配信物合計：**2,087,991 bytes**。全40件の相対パス・サイズ・ハッシュは[新パッケージ監査データ](/private/tmp/bashiiin-seo05c-20261104/package-audit.json)。

## 5. ローカルHTTP検証結果

### 正式Worker系（localhost:8787）

`node scripts/dev-local.mjs`による既存ローカルWorkerで、更新した`npm run verify:local`が**73項目通過**。旧72項目に404ドキュメントの200・MIME・バイト照合が1項目増えた。APIやルーティングの設定は変更していない。

| リクエスト | 結果 | 意味 |
|---|---|---|
| GET `/404.html` | 307→`/404/` | 既存force-trailing-slashの正規化 |
| GET `/404/` | 200、404.htmlと一致 | 直接取得したエラードキュメント。未存在URLの200返却とは別 |
| GET 未存在URL／非公開資料URL | 404 | TOPへの200フォールバックなし。Worker側の404本文は空 |
| GET `/api/contact` | **405 JSON** | メソッド検証。送信無効POSTの503と区別 |
| POST `/api/contact`（空JSON） | **503 JSON** | 無効設定を維持。実送信なし |

### 静的Pages系（localhost:8788、Wrangler Pages dev）

Wrangler **4.154.0**の`pages dev`で、同一40ファイルの検証コピーを隔離した一時フォルダから配信した。Pages用の一時設定を使い、Functions／_worker.jsを追加せず、正式Workerコードも変更していない。一時コピー40件はdistと一致する。

| GETパス | 結果 | カスタム本文 |
|---|---|---|
| `/missing-test` | 404、TOPではない | 0 bytes |
| `/about/missing-test` | 404、TOPではない | 0 bytes |
| `/api/contact` | **404、TOPではない** | 0 bytes |
| `/docs/qa/visual-refinement-2026-11-03.md` | 404、TOPではない | 0 bytes |
| `/images/formal%20ver/DSC_0052.webp` | 404、TOPではない | 0 bytes |
| `/404.html` | 正規化後200、404ドキュメントを表示 | HTMLあり |

**制約**：このローカルCLIでは、未存在URLのステータスは404だが、カスタム404本文の自動返却は確認できなかった。ブラウザー遷移用ヘッダー、隔離したPages設定、Workerとの単独実行でも同じ結果だった。原因をCloudflare本番の仕様不具合や設定不備と断定しない。公開Pagesで未知URLから404画面が表示され、TOPへ戻れるかは、アップロード後に実確認する必要がある。

[PagesのGET結果](/private/tmp/bashiiin-seo05c-20261104/pages-http.json)。変更前の公開Pagesの200結果はSEO-05Bの過去記録であり、今回同じローカル環境で200→404を前後比較した値とは扱わない。今回、公開URLへの反映・反映後のHTTP検証は行っていない。静的Pagesで503を模倣するコードも追加していない。

## 6. 既存5ページと404画面の回帰確認

| 検証 | 今回の結果 |
|---|---|
| `npm run build`／`npm run verify:dist` | 40ファイルで通過 |
| `npm test` | **355件通過、失敗・skip0**（従来352件＋404関連3件） |
| `npm run verify:local` | **73項目通過** |
| 既存5ページの文字座標・表示 | 6幅×5ページ＝30ケース通過 |
| 既存5ページの機能回帰 | 6幅×5ページ＝30ケース通過 |
| 404ドキュメントの表示・TOP帰還 | 6幅×JS有効／無効＝12ケース通過 |
| CLS通常／人工遅延回帰 | 6幅×5ページ×2条件×各2回＝120回、全件0 |

- 既存5ページを今回のdistから再表示し、TOP 1024／1440pxは句点後、次行が「木のカウンター」から始まることをRange座標で再確認。主要7語の途中分断なし、横はみ出し・写真の欠落・本文の非表示なし。
- トラックの再生／停止／ArrowRight・複製の読み上げ除外、reduced-motionの手動操作、5ページナビ・内部リンク・hash先・固定ヘッダー下のH2位置、Enter／Tab／Shift+Tab／Esc・focus復帰を再検証。
- JS無効390px×5ページ、読込失敗／ナビ初期化例外×390／1024／1440px×5ページでも主要ナビと本文を維持。
- CONTACTはdisabled・endpoint-ready=false・Site Key空。架空入力後のsubmitイベントでもPOST・generate_leadなし。5ページのnoindex、固有メタ・OGP・TOP JSON-LDと内部リンクを再検証。既存head・form内部はバイト同一。
- 404.htmlはJSリクエスト0、main／H1各1、noindex、ルート相対リンク、44px以上の操作域と2px以上のfocus outlineを確認。Tab→EnterでTOPへ実遷移できた。6幅でJS無効でも同じ導線が機能した。これは404ドキュメントを直接表示した検証で、上記の未知URLの空本文でTOPリンクが表示されたと主張するものではない。
- 404画面は390pxと1440pxを目視確認。CSSや写真追加なしで既存の白・明朝見出し・本文・リンクに整合。空の固定高さ領域は追加していない。

CLSは入力直後の移動を除外し、移動間隔1秒未満・最大5秒のsession windowで集計。JS800ms／画像1500ms遅延を含む既存5ページ120回は最大0、通常の機能回帰30ケースも初期／操作後0。404ドキュメントはJS有効の6幅で初期移動0を確認した。JS無効の6ケースは表示・帰還を検証し、PerformanceObserverによるCLS計測済みとはしていない。実ユーザー・実機のフィールド値や公開環境の測定ではない。[今回のCLSデータ](/private/tmp/bashiiin-seo05c-20261104/cls/after.json)。

404画面（JS有効）の新規画像：

| 360px | 390px | 430px | 768px | 1024px | 1440px |
|---|---|---|---|---|---|
| [表示](/private/tmp/bashiiin-seo05c-20261104/404-screenshots/360-js.png) | [表示](/private/tmp/bashiiin-seo05c-20261104/404-screenshots/390-js.png) | [表示](/private/tmp/bashiiin-seo05c-20261104/404-screenshots/430-js.png) | [表示](/private/tmp/bashiiin-seo05c-20261104/404-screenshots/768-js.png) | [表示](/private/tmp/bashiiin-seo05c-20261104/404-screenshots/1024-js.png) | [表示](/private/tmp/bashiiin-seo05c-20261104/404-screenshots/1440-js.png) |

生データ：[既存5ページの表示](/private/tmp/bashiiin-seo05c-20261104/display/measurements.json)、[既存機能](/private/tmp/bashiiin-seo05c-20261104/regression/browser.json)、[404画面12ケース](/private/tmp/bashiiin-seo05c-20261104/404-browser.json)、[355テスト](/private/tmp/bashiiin-seo05c-20261104/tests.tap)。

## 7. Git状態・既存変更の保護

開始時はformal-production／上記HEAD、追跡変更8件・未追跡62件・ステージ済み0件。開始時285ファイルをハッシュ化し、変更対象の比較用コピーを保存した。既存5 HTML／CSS／JS、未追跡原本、既存のSEO・視覚改善変更を破棄／stash／巻き戻ししていない。

今回、既存ファイルの変更は上記9件に限定。新規は404.htmlと本報告書。未追跡スクリプトのGit管理、原本画像のGit／CI供給方針は決めず、原本を追加していない。終了時比較で、既存285ファイルのうち上記9件だけが変更され、残り276件は同一、新規は404.htmlと本報告書だけであることを確認した。

ステージング・commit・push・merge・fetch・pull、Cloudflareへのアップロード／新Deployment作成、DNS／ドメイン変更、noindex解除、フォーム／API有効化、実メール送信はなし。

## 8. 新しいアップロード用ZIPのパス

[/private/tmp/bashiiin-seo05c-20261104/bashiiin-coffee-client-review-20261104-404.zip](/private/tmp/bashiiin-seo05c-20261104/bashiiin-coffee-client-review-20261104-404.zip)

**今回新規作成した40エントリのZIP。SEO-05Bの39ファイル版を再利用・上書きしていない。** ZIPのルートにindex.html／404.htmlがあり、展開した各ファイルのSHA-256は検証済みdistと一致した。ZIP自身のSHA-256：

```text
887782a3fc7ace3768fd621ff185924f2ab2ecfe55e6d67d91921ef8a7eb4482
```

配信元distの正確なパス：

```text
/Users/ritsuki/GitHub/misemiru-web/Bashiiin--coffee/dist
```

ソース／distが以後変更された場合は再build・再検査が必要。QA資料やパッケージ監査JSONはこのZIPに入れていない。

## 9. Cloudflare Pagesで更新すべきプロジェクト・環境

- 対象プロジェクト：**bashiiin-coffee-client-review**。
- 更新したい店舗確認用の安定URL：**https://bashiiin-coffee-client-review.pages.dev/**。
- 正式本番サイトではない。このレビュー専用プロジェクト内で安定URLへ対応する環境を確認してから更新する。Dashboard上のProduction表示を店舗の正式本番と混同せず、別のPreview URLへの反映を安定URL更新済みとも扱わない。
- アカウント・権限・Direct Upload／Git連携・production branchの管理画面上の状態は今回未確認。
- 将来の明示許可後に、この新ZIPまたはdistの40ファイルだけを既存プロジェクトへアップロードし、新Deploymentを作成する。今回はその画面操作も実行していない。
- 反映後の必須確認：未知URL／下層未知URL／GET /api/contactが**404でカスタム404画面を返す**、noindexがある、TOP帰還が動く、既存5ページ・画像・コピー境界・無効フォームが正常。ここまで終える前に公開版の404対応完了とは断定しない。

## 10. 残存課題

1. **Pagesローカルの空404本文と、公開反映後のカスタム404表示の確認**。40ファイルZIPの整合と404ドキュメント単体は検証済み。現段階では未知URLでの案内画面・帰還を公開確認済みとしない。
2. Git再現性：未追跡SEOスクリプト4件／build用原本10点の管理方針はSEO-05Bから保留。今回無断Git追加しない。
3. 専用CONTACT検証系（contact-negative／contact-e2e等）は、過去承認の39ファイル・ハッシュ等の固定ベースラインを持つ。本工程ではその安全ガードや既存検証環境を更新・再配信していない。新40ファイルをそれらの候補生成へ流用する場合は別途の差分レビューが必要。今回の355件はpackage.jsonのnpm testの結果であり、全ての別系統・実環境検証を再実行した意味ではない。
4. 店舗の全ページ最終承認、掲載許可・店舗固有情報、正式ドメイン・本番フォーム接続・GA4等の既存保留は変更なし。

終了時はformal-production／HEAD不変、追跡変更15件・未追跡64件・ステージ済み0件。今回の新規2件と限定9ファイル以外は保護し、所有するWorker／Pagesローカルサーバーとブラウザーを終了した。新ZIPの40件とdistの最終照合も通過。作業を終了し、次の指示を待って停止する。
