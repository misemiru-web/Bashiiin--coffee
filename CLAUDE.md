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
- commit、pull、fetch、push、デプロイはユーザーの明示許可がある場合だけ行う。
- 変更に関係する既存のbuild、lint、typecheck、testだけを実行し、未実行の検証を実行済みと報告しない。
- 技術、起動方法、公開方法、外部サービス、更新箇所を変えた場合はREADMEも確認する。
- 作業後は変更、検証、未確認事項、Git操作と公開操作の有無を報告する。

## 案件固有ルール

- build工程のない静的HTML / CSS / JavaScriptとして扱う。
- `main` へのpushは `.github/workflows/deploy-pages.yml` によりGitHub Pagesのデプロイを起動するため、許可なしにpushしない。
- `noindex, nofollow, noarchive` と `Concept Preview` を確認なしに変更しない。
- 主な情報は `index.html`、動作は `script.js`、公開画像は主に `images/web/` にある。
- `script.js` の独自イベント・dataLayer処理だけでGA4導入済みとは判断しない。
