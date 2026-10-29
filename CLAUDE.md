# CLAUDE.md

## 目的

このファイルは、このリポジトリでClaude Codeが守るルールです。最初に `README.md` と `AGENTS.md` を読み、案件固有ルールを優先してください。

## 共通ルール

- `git status`、現在のbranch、既存変更を作業前に確認する。
- コード、設定、lockfileから現在の技術構成を判定し、存在しないnpm scriptやbuild手順を創作しない。
- 既存構成を理由なくNext.js、React、TypeScript等へ移行しない。
- 店舗情報、契約・承認・公開状況、公開URL、ホスティング、ドメインを推測しない。不明点は `要確認` とする。
- 仮情報、TODO、ダミーリンクを正式情報として扱わない。
- 利用権限が不明な画像や文章、不要な依存関係・外部サービスを追加しない。
- 認証情報、秘密鍵、トークン、不要な個人情報をコード、文書、回答、ログへ表示・保存しない。
- 依頼範囲外の変更、無関係な整形、全面的なデザイン変更を行わない。
- 既存の機能、レスポンシブ、アクセシビリティ、SEO、リンク、フォームを壊さない。
- 未コミット変更を破棄・上書き・stashしない。
- force push、reset、rebase、履歴書き換え、remote変更を行わない。
- commit、pull、fetch、push、merge、デプロイはユーザーの明示許可がある場合だけ指定範囲で行う。ステージングも許可されたファイルを個別確認し、`git add .` / `git add -A` による無差別追加や、未追跡の原本・旧画像・作業用資料の無断追加をしない。
- 変更に関係する既存のbuild、lint、typecheck、testだけを実行し、未実行の検証を実行済みと報告しない。
- 技術、起動方法、公開方法、外部サービス、更新箇所を変えた場合はREADMEも確認する。
- 作業後は変更、検証、未確認事項、Git操作と公開操作の有無を報告する。

## 案件固有ルール

- フロントエンドは静的HTML / CSS / JavaScriptを維持する。Node.jsによる許可リスト式buildとCloudflare Workerを実装済み。既存の `package.json` scripts・lockfile・Wrangler設定を確認し、フレームワークへ移行しない。
- 現行基準は `docs/requirements/requirements_v1.6_2026-10-13.md`、`docs/design/design-system_v1.6_2026-10-13.md` と最新の明示指示。STEP 07.5の現在のデザインを旧LP構成・旧資料の数値へ戻さない。
- `main` は営業サンプル用、`formal-production` は正式5ページ版制作用。指示なく相互に変更を反映しない。`main` へのpush等で `.github/workflows/deploy-pages.yml` がGitHub Pages配信を起動するため、影響を確認し、正式5ページ版へ流用しない。正式版と営業サンプルの公開環境を分離する。
- 正式公開承認と公開工程の明示指示が揃うまで、全ページの `noindex, nofollow, noarchive` を維持する。旧営業サンプルの `Concept Preview` 等のプレビュー表記は正式5ページ版へ引き継がない。
- 店舗情報・コンテンツは5ページで分担する。TOP `index.html` は写真トラック・最新情報のInstagram案内・各ページへの入口、ABOUT `about/index.html` はSPACE / SWEETS / CULTURE、COFFEE `coffee/index.html` はコーヒー紹介・CURRENT BEANS、CONTACT `contact/index.html` は3項目フォーム、ACCESS `access/index.html` は住所・Google Maps・最新営業情報へのInstagram導線・看板写真を管理する。共通HEADER / FOOTERの重複情報も整合させる。共通動作は `script.js`、見た目は `styles.css` で管理する。
- 写真は原本が `images/formal ver/` に存在する店舗提供写真由来の、確認済み配信用WebPを使う。現在の配信写真は `images/web/` 配下の各用途フォルダにあり、原本・派生サイズ・実際の使用箇所・掲載許可の確認状態は `docs/asset-map.md` に従う。ロゴ・ブランドマーク・faviconのみ原本フォルダ制限の例外とする。
- 写真原本を削除・移動・rename・上書きせず、AI生成・AIによる内容改変をしない。派生生成は事前に必要性を報告し、保存先変更時は既存構成と参照関係を確認する。原本・未使用画像・旧AI仮素材・作業用入力資料は本番配信に含めず、未追跡素材を無断でGitへ追加しない。
- Cloudflare Workers Static Assets向け限定ビルドとCONTACTバックエンド（入力再検証・Turnstile Siteverify・メール通知）はローカル実装・テスト済み。公開許可リスト `scripts/public-files.json` の39ファイルだけを `dist/` へ出力し、Workerは `/api/*` を処理する。Workerソース・管理資料・原本・未使用素材・SecretをStatic Assetsへ追加しない。
- Cloudflare本番環境は未構築・未デプロイ。実Siteverify・実メール到達は未検証。`CONTACT_API_ENABLED` / `EMAIL_SENDING_ENABLED` は文字列 `"false"`、フォームはdisabled・`data-endpoint-ready="false"`・Site Key空のまま維持する。必要なSecret・送信元／宛先・origin・メール／レート制限bindingsが欠ければAPIは503で拒否する。フラグだけの変更で有効化済みと扱わない。秘密情報をフロントエンドへ記載せず、未接続のまま偽成功を表示しない。
- Cloudflare導入・実認証・実メールテストは `docs/operations/cloudflare-launch-checklist.md` で承認・環境分離・アクセス制御を確認してから、明示許可された工程だけで行う。現在のbuildはnoindexとフォーム無効を必須にするため、有効化時は検証条件も別途レビューする。レート制限の閾値・重複通知方針は未確定で、実装済みと混同しない。
- 正式URLを用いたSEO最終設定・GA4接続・公開前最終QA・店舗の全ページ最終公開承認は未完了として扱い、既存のtitle / description / TOPのJSON-LD等と混同しない。
- `script.js` の独自イベント・dataLayer処理だけでGA4導入済みとは判断しない。
