# Bashiiin! coffee

Bashiiin! coffeeのWebサイトを管理するリポジトリです。コードとGit設定から確認できる事実を記録し、業務状態や公開状態が未確認の項目は `要確認` としています。

## 1. 基本情報・現在の状態

- 案件名: Bashiiin! coffee
- 内容: 店舗情報を掲載する静的Webサイト
- HTML title内の表記: `Concept Preview`
- robots設定: `noindex, nofollow, noarchive`
- 現在の制作・承認・公開・保守状態: 要確認
- 正式な公開URL: 要確認
- README最終更新日: 2026-08-16

上記のコード表記は確認済みですが、現在の契約区分や公開判断を示すものとは断定しません。

## 2. Repository

- GitHub: https://github.com/jiandouchuiming-cell/Bashiiin--coffee.git
- 基準branch: `main`
- 公開済み安定版を示すcommit / tag: 要確認

## 3. 技術構成

- HTML / CSS / JavaScript
- package manager: なし
- `package.json`: なし
- Node.js指定: なし
- 専用build工程: なし

## 4. セットアップ・確認方法

依存関係のインストールは不要です。専用の開発起動・buildコマンドはありません。ルートの `index.html` と関連ファイルを静的サイトとして確認します。

### Build

- buildコマンド: なし
- build出力先: なし

存在しないnpmコマンドを追加・実行しないでください。

## 5. 主な構成と更新箇所

- `index.html`: 店舗情報、本文、主要リンク、SEO情報
- `style.css`: レイアウトと見た目
- `script.js`: 画面動作、独自分析イベント、dataLayer連携処理
- `images/web/`: サイトで利用する主な画像
- `images/source/`: 元素材用の場所。Git追跡状況を確認して扱う
- `.github/workflows/deploy-pages.yml`: GitHub Pagesデプロイworkflow

店舗情報を変更するときは `index.html` 内の重複表記を確認します。画像差し替えでは公開用と元素材を混同せず、権利とGit追跡状況を確認します。

## 6. 外部サービス・フォーム・解析

- Instagramへの外部リンク
- Googleマップへのリンクと埋め込み
- Google Fonts
- リポジトリ内で送信処理を持つフォーム: なし
- Search Console設定: 要確認
- GA4タグ: コード上では確認できない
- `script.js`: 独自イベント `bashiiin:analytics` を送出し、dataLayerが存在する場合にデータを追加

上記JavaScriptだけを根拠に、GA4が導入・運用中とは判断しません。

## 7. SEO

- `title`、description、robots等は主に `index.html` で管理
- 現在のrobots: `noindex, nofollow, noarchive`
- `noindex` を外す条件と承認者: 要確認
- canonical: コード上では確認できない

## 8. 公開・ホスティング・ドメイン

- デプロイ方式: `.github/workflows/deploy-pages.yml` が `main` へのpushでGitHub Pagesへrootをデプロイ
- 現在実際に公開中か: 要確認
- 正式な公開URL: 要確認
- 独自ドメイン、DNS、所有者: 要確認

`main` へのpushはデプロイを起動し得るため、公開可否を確認せず実行しないでください。

## 9. QA・素材・引継ぎ

- リポジトリ内の公開前QAチェックリスト: 確認できない
- 画像・文章の利用許諾範囲: 要確認
- 公開前の確認者・承認条件: 要確認
- 復元はGit履歴を基準にし、安定版commit / tagは関係者へ確認する

共通QAテンプレートはリポジトリへ自動コピーせず、必要時に別途適用します。

## 10. 未確認事項

- 現在の案件状態、公開状態、承認状態、保守範囲
- 正式な公開URL、独自ドメイン、DNS
- `Concept Preview` と `noindex` を外す時期・条件
- Instagram、Googleマップの正式な運用先
- Search Console / GA4の導入・管理状況
- 素材の権利確認状況、公開前QAと承認記録

## 11. 認証情報

パスワード、APIキー、秘密トークン、個人情報をREADMEやGitへ保存しないでください。必要な認証情報の保管先と共有方法は、関係者へ確認してください。
