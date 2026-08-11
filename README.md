# Bashiiin! coffee — Concept Preview

Bashiiin! coffeeの営業提案用・非公式コンセプトLPです。Next.js App RouterとTypeScriptで実装し、GitHub Pagesで公開します。検索除外、型付きサンプルコンテンツ、CTAイベント契約を含みます。

公開URL: <https://jiandouchuiming-cell.github.io/Bashiiin--coffee/>

## ローカル起動

```bash
npm install
npm run dev
```

`http://localhost:3000` を開いてください。パスワード認証はありません。

## コマンド

```bash
npm run lint
npm run build
npm run capture
```

`npm run capture` は、開発サーバー起動中にローカルのGoogle Chromeをヘッドレス実行し、デスクトップ・モバイルの検証画像を `/private/tmp/bashiiin-*.png` へ出力します。
別URLを検証する場合は `PREVIEW_URL` 環境変数で指定できます。

## GitHub Pagesへの公開

`main` ブランチへのpushで `.github/workflows/deploy-pages.yml` が静的サイトをビルドし、GitHub Pagesへ自動公開します。リポジトリ設定の Pages / Build and deployment は `GitHub Actions` を使用します。

公開ページは誰でもURLから閲覧できます。一方で、非公式営業サンプルのため `noindex` と `robots.txt` による検索除外は維持しています。

## コンテンツと素材

- 現在の豆、営業カレンダー、カルチャー情報は明示されたサンプルデータです。
- 住所と外部リンクは第三者公開情報をもとにした暫定値です。
- Instagram投稿画像や店舗写真は転載していません。
- `APPROVED IMAGE SLOT` は、店舗から許諾済み素材を受領した後の差し替え位置です。
- 正式ロゴSVGを受領後、`components/logo-mark.tsx` の暫定マークを差し替えてください。

要件定義書（`Bashiiin_coffee_LP_要件定義書_*`）は `.gitignore` で除外されており、リポジトリへ公開されません。
