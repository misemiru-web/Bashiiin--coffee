# 2026-11-15 ビルド再現性・QA保存対象の整理

## 1. 総合判定

**A：GitHub反映可能。** 以下の保存対象を個別にcommitする前提で、原本10点がない環境のbuild・検証・367テストと、READMEから今回QA資料へのリンク整合を確認した。今回git add・commit・push・deployは行っていない。本番公開の承認・準備完了とは区別する。

対象branchは `formal-production`。作業前／作業後HEADは `95468695bf0014ae9a8f5b3e2805d8316483ceee`。店舗修正済みの5 HTML・CSS・JS・配信用画像・既存の意図した未コミット修正は、今回の作業開始時のバイト内容を維持した。

## 2. 原本依存の調査

変更前は `scripts/build-static.mjs` の `sourceInventory()` が、配信対象WebPごとに画像管理表の原本名・SHA-256を取得し、ローカル原本を必ず読み込んでいた。ファイルがなければ `checkedPath()` のlstat／readがENOENTで失敗し、build・verifyと、この共通関数を呼ぶテスト／補助ツールも開始できなかった。

原本はすべて `images/formal ver/` 配下で、以下10点はいずれもGit未追跡。派生画像30件は原本の再生成なしに配信できる。既存追跡WebPに、店舗指定写真①の新規WebP 3件をGit保存対象として加えれば、必要な配信画像が揃う。

| 用途 | 原本ファイル名（上記フォルダ内） | 配信用WebP（`images/web/` 以下、3サイズ） |
|---|---|---|
| TOP写真1 | `DSC_0052.webp` | `hero/DSC_0052-{400,800,1450}.webp` |
| TOP写真2 | `829940080_1786515612391095_3237499876071483915_n.webp` | `hero/coffee-packages-{400,800,1206}.webp` |
| TOP写真3 | `830324349_4550763371904964_7100813407432157579_n.webp` | `journal/spoon-{400,800,1206}.webp` |
| TOP写真4 | `DSC_0132.webp` | `journal/DSC_0132-{400,800,1450}.webp` |
| TOP写真5 | `833135303_1893980718650582_7245257760060958267_n.webp` | `journal/coffee-pouring-{400,800,1206}.webp` |
| ABOUT／SPACE | `DSC_0030.jpeg` | `space/DSC_0030-{400,800,1450}.webp` |
| ABOUT／SWEETS | `R0000476.webp` | `sweets/R0000476-{400,800,1920}.webp` |
| ABOUT／CULTURE | `DSC_0165.webp` | `culture/DSC_0165-{400,800,1450}.webp` |
| COFFEE主写真 | `836650886_1839293087060384_1504843703391329726_n.webp` | `coffee/coffee-preparation-{400,800,1206}.webp` |
| ACCESS看板 | `835355627_2191449308084144_6214797320265951783_n.webp` | `hero/entrance-sign-{400,800,1206}.webp` |

各原本の完全なパス・原本SHA-256・派生3ファイルは [検証結果JSON](build-reproducibility-2026-11-15.json) に列挙する。原本ハッシュの正本は [画像管理表](../asset-map.md) の寸法表に保持している。元の受領JPEGと保管コピーを含め、原本・旧画像の移動・削除・上書きは行っていない。

### 他の利用箇所

- `build-static.test.mjs`／`build-staging.test.mjs`／`production-seo.test.mjs` は原本をfixtureへ必須コピーしていた。3箇所とも配信用ファイル・管理情報だけのfixtureへ変更した。原本照合の単体テストは一時領域内の合成データで検証する。
- `build-staging.mjs`／`verify-local.mjs`／`contact-local.browser.mjs`、CONTACTのe2e／negative／email-service補助ツールも共通の `sourceInventory()` を使うため、通常経路での原本依存が外れる。
- 過去の任意CONTACT補助ツールには39配信ファイル前提が残るものがある。今回の通常40ファイルbuild・package.jsonのtest対象には含まれず、本作業では無関係な改修をしていない。
- 通常buildに画像再生成・圧縮処理は元から存在しない。原本からの再生成は制作時の別作業とし、今回は実行していない。

## 3. 変更した検証方式

1. [asset-integrity.json](../../scripts/asset-integrity.json) に、現在の配信用WebP 30件・PNG 2件の固定SHA-256を追加。
2. 通常build／verifyは全32画像の存在・固定ハッシュ・形式を必須確認。管理JSONの対象集合は公開許可リストの画像と完全一致させ、項目不足・余分な項目・不正ハッシュ・未知versionを拒否する。
3. 原本対応と原本SHA-256の記録は引き続き必須。原本が存在すれば従来どおりSHA-256を照合し、不一致を拒否する。原本不在のENOENTだけを通常buildで許容し、symlink・異常なファイル形式（directory等）・権限等のI/Oエラーは許容しない。
4. `node scripts/build-static.mjs --verify-originals` は原本10点すべてを必須にする読み取り専用の厳密監査。原本なし環境では失敗する。

管理JSONをビルド中に再生成して差分を隠す処理や、広いcatchで検証エラーを無視する処理は追加していない。画像変更時は配信用画像・ハッシュ・原本対応を併せてレビューする。原本未配置環境で確認できるのは、記録した出自と承認済み配信バイトの一致であり、原本そのものの再照合ではない。

## 4. クリーン環境の再現テスト

既存Git追跡ファイルと、今回Git保存する候補だけを一時ディレクトリへ複製した。元のnode_modules・dist・未追跡原本はコピーしていない。過去にGit追跡された旧JPEG派生は取得済みファイルとして残るが、下の現用原本10点はすべて存在しない。

| 確認 | 結果 |
|---|---|
| lockfileどおりの依存導入 | `npm ci --ignore-scripts --no-audit --no-fund --cache <一時キャッシュ>`：成功、41 packages。新規依存・lockfile変更なし |
| 原本10点の存在 | 全10点不在。元の作業ディレクトリでは原本を保持し、ハッシュ不変 |
| `npm run build` | 成功、40ファイル |
| `npm run verify:dist` | 成功、許可リストと一覧・バイト内容一致 |
| 改善前の正常出力との比較 | 全40ファイルが作業開始時とバイト同一 |
| `npm test` | **367 / 367 PASS**、失敗・skipなし |
| `--verify-originals` | 原本なしではENOENTで拒否：仕様どおり |
| 元の作業環境の原本監査 | 全10点を照合して成功 |
| 元の作業環境のbuild／verify／test | 40ファイル・367テストすべて成功 |
| HTML／CSS／JS／画像 | 作業開始時から配信40ファイルすべて不変。意図した既存修正を維持 |
| 非公開ファイル混入 | 原本・管理JSON・QA・設定・開発ファイルはdistに含まれない |

既存355件のうち、原本不在を拒否するテストを新仕様の成功＋厳密監査の拒否へ更新し、原本改変テストを合成fixtureへ更新。12件を追加して計367件。原本なしでのWebP／PNG改変、管理情報の不足・不正、原本対応／ハッシュ記録の欠落、原本symlink／directory、全原本厳密照合を検証した。画像改変失敗時に既存distが上書きされないことも確認した。

今回、ブラウザー・実機・外部サービスの試験は再実行していない。配信バイトは不変で、表示・操作の前回QAは [11月13日報告](store-design-revisions-2026-11-13.md) の記録として保持する。今回は実メール・Siteverify・GA4への通信を行っていない。

## 5. QA資料の選定と安全確認

- 保存候補：11月13日報告Markdown、全5ページ×390／1440pxのPNG 10件、`browser-results.json`、`static-results.json`。
- 今回追加する小規模資料：本報告、[結果JSON](build-reproducibility-2026-11-15.json)、[Git保存計画JSON](github-save-plan-2026-11-15.json)。
- PNG 10件は計5,456,820 bytes。JSONは72,570／919 bytes。各ファイルの正確なサイズ・画像寸法・SHA-256は結果JSONに記録した。画面幅別の見た目と前回検証内容を確認する証跡として選定し、再圧縮・再撮影はしていない。
- PNGはサイトの表示・空のフォーム・店舗提供写真。画面内の認証UI・管理画面・資格情報・個人の入力データは認めない。画像内の店舗写真は既存の掲載写真として扱う。JSONは検査結果・CSS値・画像寸法等で、フォーム入力値やtokenを保存していない。鍵・token・資格情報入りURLの形式検査でも候補を検出していない。
- 保存候補全体の形式検査では `scripts/production-seo.test.mjs` の不正URL拒否テスト用文字列が1件該当した。HEADにも存在する合成fixtureで、実際の資格情報ではないことを確認した。この安全性テストは維持し、実機密の検出件数は0件とした。
- README／画像管理表／今回2報告からのローカルMarkdownリンクは、既存追跡ファイルまたは保存候補だけを参照することを確認した。Git管理予定ファイルだけの一時コピーでもリンク先がすべて存在する。
- 原本、旧JPEG、未使用素材、過去の無関係な未追跡QA文書、ログ、中間出力、dist／dist-staging／.wranglerは今回のcommit候補に含めない。

## 6. Git保存対象の分類

正確な全パスは [Git保存計画JSON](github-save-plan-2026-11-15.json) にA／B／Cとして記録する。**Aは34件、Bは既存未追跡の56件、Cは0件。** 既存追跡済みで差分のないファイルは通常のリポジトリ内容として残し、今回のcommit差分へ混ぜない。

| 分類 | 対象・理由 |
|---|---|
| A：今回開始時から変更されていた10件 | 5 HTML、styles.css、script.js、scripts/public-files.json、docs/asset-map.md、README.md。店舗修正・意図した既存修正と必要な管理情報を保存する |
| A：今回変更した既存4件 | build-static.mjs、build-static.test.mjs、build-staging.test.mjs、production-seo.test.mjs。原本なしbuild・関連fixture・拒否試験 |
| A：新規20件 | WebP 3件、11月13日QA資料13件、asset-integrity.json、今回報告・結果JSON・保存計画JSON |
| B：ローカル保管のみ | 未追跡の受領原本・保管原本・旧派生画像・未使用画像・過去QA・JSON-LD入力資料。原本10点も含み、Git保存不要を再現テストで確認 |
| C：確認が必要 | 今回の保存範囲に未決ファイルなし。店舗の写真重複・最終デザイン／公開承認は別工程 |

原本をGit保存しないことと、画像の出自・ハッシュ記録を削除することは別。原本はローカル保管のまま、必要に応じ厳密監査・再生成へ利用できる。既存追跡済み原本関連ファイルを無断削除する処理も行っていない。

## 7. 未解決事項・次工程

今回の2問題について必須対応の残りはない。Aの34件を個別確認してgit add／commit／pushへ進める状態だが、今回はいずれも実行していない。main・公開設定・DNS・メール送信・Cloudflare配信も変更していない。

本番公開前のSEO、GA4、実Siteverify／実メール到達、実機QA、店舗の最終公開承認は別工程。ABOUT／COFFEEの同一カット重複は店舗指示を優先して保持し、店舗確認事項のままとする。
