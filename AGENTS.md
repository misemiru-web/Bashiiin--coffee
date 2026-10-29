# AGENTS.md

## 目的

このファイルは、このリポジトリでCodexが守る実装ルールです。案件の事実と更新方法は `README.md` を参照してください。

## 指示の優先順位

1. ユーザーが現在のタスクで明示した指示
2. このファイルの `案件固有ルール`
3. `README.md`、要件資料、QA文書にある確認済み情報
4. このファイルの共通ルール

競合や不明点がある場合は推測せず、`要確認` として報告する。

## 作業前

- `AGENTS.md`、`CLAUDE.md`、`README.md`、既存資料、主要コードを読む。
- `git status` と現在のbranchを確認し、既存変更を保護する。
- `package.json`、lockfile、設定ファイルの有無から現在の技術構成を判定する。
- 存在しないコマンド、テスト、外部サービスを前提にしない。

## 共通実装ルール

- 店舗情報、契約・支払・承認・公開状況、保守範囲、公開URL、ホスティング、ドメイン所有者を推測しない。
- 店名、住所、営業時間、料金、予約方法、SNS URL等は確認済み情報だけを根拠に変更する。
- 仮情報、ダミーリンク、TODO、サンプル表記を正式情報として扱わない。
- 既存技術、構成、命名、デザインを尊重し、依頼なしにフレームワーク移行や全面改修をしない。
- 不要な依存関係、ページ、機能、外部サービスを追加しない。
- PC、スマートフォン、代表的なタブレット幅で重大な崩れを起こさない。
- 既存のアクセシビリティと `title`、description、見出し、canonical、robots、OGP等のSEO設定を悪化させない。
- リンク、電話、SNS、マップ、予約導線、フォームを変更した場合は遷移・送信先を確認する。
- 利用権限を確認できない画像や第三者コンテンツを追加しない。
- パスワード、秘密鍵、APIトークン、不要な個人情報をコード、文書、Git履歴、回答へ表示・保存しない。

## Git・変更範囲

- 対象外ファイルを変更せず、無関係な整形やリファクタリングを混ぜない。
- 未コミット変更を勝手に破棄、上書き、stashしない。
- force push、reset、rebase、履歴書き換え、remote変更、重要branch削除を明示依頼なしに行わない。
- commit、pull、fetch、push、merge、deploy・公開は、ユーザーが許可した場合だけ指定範囲で行う。
- ステージングは許可されたファイルを個別確認して行い、`git add .` / `git add -A` による無差別追加を避ける。未追跡の原本・旧画像・作業用入力資料を無断で追加しない。

## 検証・文書

- `package.json` がある場合は既存scriptsを確認し、変更に関係するbuild、lint、typecheck、testを実行する。
- 静的サイトではコマンドを創作せず、差分、HTML、リンク、主要表示を確認する。
- 実行していない検証を実行済みと報告しない。
- 技術、起動・build方法、公開方法、外部サービス、主要更新箇所を変えた場合はREADMEの更新要否を確認する。
- 本番公開、デプロイ、DNS変更は明示依頼がある場合だけ行う。
- 作業後は変更内容、検証結果、未確認事項、commit・push・公開の有無を報告する。

## 案件固有ルール

- フロントエンドは静的HTML / CSS / JavaScriptを維持する。Node.jsによる許可リスト式buildとCloudflare Workerを実装済み。既存の `package.json` scripts・lockfile・Wrangler設定を確認して作業し、フレームワークへ移行しない。
- 現行基準は `docs/requirements/requirements_v1.6_2026-10-13.md`、`docs/design/design-system_v1.6_2026-10-13.md` と最新の明示指示。STEP 07.5で調整した現在のデザインを、旧資料の数値・旧LP構成へ戻さない。
- `main` は営業サンプル、`formal-production` は正式5ページ版の制作branchとして扱い、指示なく相互に変更を反映しない。`.github/workflows/deploy-pages.yml` は `main` へのpush等でGitHub Pagesへデプロイする既存設定のため、影響を事前確認し、正式5ページ版へ流用しない。正式配信環境と営業サンプルの公開環境を分離する。
- 正式公開承認と公開工程の明示指示が揃うまで、全ページの `noindex, nofollow, noarchive` を維持する。旧営業サンプルの `Concept Preview` 等のプレビュー表記は正式5ページ版へ引き継がない。
- 店舗情報・コンテンツは5ページで分担する。TOP `index.html` は写真トラック・最新情報のInstagram案内・各ページへの入口、ABOUT `about/index.html` はSPACE / SWEETS / CULTURE、COFFEE `coffee/index.html` はコーヒー紹介・CURRENT BEANS、CONTACT `contact/index.html` は3項目フォーム、ACCESS `access/index.html` は住所・Google Maps・最新営業情報へのInstagram導線・看板写真を管理する。共通HEADER / FOOTERの住所・リンク等を変更する場合は5ページ間の整合性も確認する。
- `script.js` の独自イベントとdataLayer連携を、GA4導入済みの証拠として扱わない。
- `images/source/` はGit管理状況を確認してから扱い、追跡対象外素材を誤ってcommitしない。
- 正式版の写真はサイト全体（HERO・各セクション・OGP・JSON-LDのimageを含む）で 原本が `images/formal ver/` に存在する店舗提供写真だけを使用する。そこから作成したリサイズ・圧縮・適切なトリミング等のWeb最適化版は `images/web/` 等への保存も可能。参照パスではなく原本との対応を確認する。旧資料の営業サンプル素材継続使用よりこのルールを優先する。
- ロゴ・ワードマーク・シンボル・favicon等のブランド素材だけはフォルダ制限の例外。ロゴ以外の例外を作らない。
- 写真は実内容を確認して選定・altを設定する。AI生成・AIによる内容改変、無関係な素材による穴埋め、未確認の商品名・活動の断定をしない。
- 写真配分は正式原本由来の別写真、必要最小限の重複、枚数削減の順に判断する。重複が発生した場合は対象ファイルと使用箇所を報告する。正式原本のない旧写真で枚数を補わない。HEROのループ複製は同一ギャラリー内の実装であり、読み上げを重複させない。
- 元写真の削除・上書き・rename・移動は行わない。正式サイトの写真には原本との対応を確認した配信用WebPを使用する。現在の参照先は `images/web/hero/`、`coffee/`、`sweets/`、`space/`、`culture/`、`journal/`（いずれも `images/web/` 配下）。`journal/` の写真は現在TOP、`hero/entrance-sign-*` は現在ACCESSで使用しているため、フォルダ名だけで用途を判断しない。共通ブランド素材は `images/web/logo-header.png` と `images/web/favicon.png`。
- 原本・配信用素材・派生サイズ・使用箇所・掲載許可の確認状態は `docs/asset-map.md` で管理する。派生画像の生成が必要なら実行前に必要性を報告し、原本を保持する。生成先を変更する場合は既存構成・HTMLの参照関係を確認し、旧保存先 `images/formal ver/web/` を一律に指定しない。原本・未使用画像・旧AI仮素材・作業用入力資料は本番配信へ含めない。
- Cloudflare Workers Static Assets向け限定ビルドとCONTACTバックエンド（入力再検証・Turnstile Siteverify・メール通知）はローカル実装・テスト済み。公開許可リスト `scripts/public-files.json` の39ファイルだけを `dist/` へ出力し、Workerは `/api/*` を処理する。Workerソース・管理資料・原本・未使用素材・SecretをStatic Assetsへ追加しない。
- Cloudflare本番環境は未構築・未デプロイ。実Siteverify・実メール到達は未検証。`CONTACT_API_ENABLED` / `EMAIL_SENDING_ENABLED` は文字列 `"false"`、フォームはdisabled・`data-endpoint-ready="false"`・Site Key空のまま維持する。必要なSecret・送信元／宛先・origin・メール／レート制限bindingsが欠ければAPIは503で拒否する。フラグだけの変更で有効化済みと扱わない。秘密情報をフロントエンドへ記載せず、未接続のまま偽成功を表示しない。
- Cloudflare導入・実認証・実メールテストは `docs/operations/cloudflare-launch-checklist.md` で承認・環境分離・アクセス制御を確認してから、明示許可された工程だけで行う。現在のbuildはnoindexとフォーム無効を必須にするため、有効化時は検証条件も別途レビューする。レート制限の閾値・重複通知方針は未確定で、実装済みと混同しない。
- 正式URLによるSEO最終設定・GA4接続・公開前最終QA・店舗の全ページ最終公開承認は未完了として扱い、実装済みのtitle / description / TOPのJSON-LDや計測用イベントと混同しない。
