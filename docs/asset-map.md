# Bashiiin! coffee Asset Map

**Status:** 正式制作前・素材選定中  
**Purpose:** 正式Webサイトで使用する画像の役割・採用状況・差し替え条件を管理する一覧です。

> 現在リポジトリ内にある画像は、すべてInstagram画像をもとに生成AIで加工・生成した仮素材です。  
> **正式サイトではAI生成画像を使用しません。**  
> 現在の画像は、レイアウト確認・デザインリファレンス・仮実装専用として扱い、クライアントから正式写真を受領後に差し替えます。

---

## 1. 運用ルール

- `images/source/`
  - 元素材・受領素材・仮素材を保管する場所。
  - クライアントから新しく届いた写真は、まずここに保存する。
- `images/web/`
  - 正式サイトで実際に使用するために、採用確定・補正・リサイズ・圧縮まで完了した画像のみを置く場所。
  - **現時点の `images/web/` 内画像はすべて仮素材であり、本番用確定画像ではない。**
- `docs/references/`
  - Desktop / Mobile のデザインリファレンス画像。
  - 実装時の構図・余白・写真比率・情報階層の参考として使用する。
- 現在のAI生成画像は削除せず、正式写真への差し替えが完了するまで仮素材として保持してよい。
- 正式写真受領後は、同一セクション内で候補比較を行い、採用画像を決定してから `images/web/` に書き出す。
- 元写真は上書きせず、補正後画像は別ファイルとして保存する。
- 正式サイトでは、実店舗・実商品・実際の提供内容に沿った写真を優先する。
- 人物写真は、クライアント側でWeb掲載可能と確認されたものだけを使用する。
- AI生成画像・AIで内容を作り変えた画像は正式公開には使用しない。

---

## 2. セクション別 Asset Map

### HERO

- **必要数:** 1枚
- **用途:** Desktop Hero / Mobile Hero
- **必要な写真:** コーヒー抽出、店内、またはBashiiin! coffeeらしさが一目で伝わる強い写真
- **望ましい条件:**
  - 主役が明確
  - Desktopで横長に使いやすい
  - Mobileでもトリミングしやすい
  - コピーを配置できる余白または暗部がある
- **現在の状態:** 未確定
- **現行仮素材:** AI生成・加工素材のため本番使用不可
- **参考候補:**
  - `images/source/hand-drip-coffee-brewing.png`
  - `images/source/bashiiin-coffee-bar-interior.png`
  - `images/web/hero-bar-interior.jpg`
  - `images/web/hand-drip.jpg`
- **正式採用:** クライアント追加写真受領後に決定

### LATEST INFO

- **必要数:** 0枚
- **用途:** 営業情報・Instagram導線
- **方針:** 原則テキスト＋UIのみで構成
- **現在の状態:** 画像不要

### COFFEE

- **必要数:** 1〜2枚
- **用途:** スペシャルティコーヒー・抽出・一杯の魅力を伝える
- **必要な写真:**
  - ハンドドリップ
  - コーヒーカップ
  - 抽出器具
- **望ましい条件:**
  - 抽出工程やコーヒーの質感が伝わる
  - 人物が写る場合は掲載許可済みであること
- **現在の状態:** 未確定
- **現行仮素材:** AI生成・加工素材のため本番使用不可
- **参考候補:**
  - `images/source/hand-drip-coffee-brewing.png`
  - `images/source/black_coffee_with_cookie.png`
  - `images/source/coffee_brewing_station.png`
  - `images/source/pour_over_coffee_setup.png`
  - `images/web/coffee-cup.jpg`
  - `images/web/brewing-station.jpg`
- **正式採用:** クライアント追加写真受領後に決定

### CURRENT BEANS

- **必要数:** 1〜2枚
- **用途:** 現在扱っている豆・パッケージ・豆の魅力を伝える
- **必要な写真:**
  - 現在扱っている豆
  - 豆袋・パッケージ
  - 必要に応じて豆そのもの
- **望ましい条件:**
  - 商品名やパッケージが実物と一致している
  - 公開時点の取扱内容と一致している
- **現在の状態:** 未確定
- **現行仮素材:** AI生成・加工素材のため本番使用不可
- **参考候補:**
  - `images/source/blend-no02-coffee-beans-package.png`
  - `images/source/coffee_bean_bags_pair.png`
  - `images/source/colorful_drip_coffee_bags.png`
  - `images/source/gold_coffee_blend_bag.png`
- **正式採用:** クライアント追加写真・公開時の取扱豆確認後に決定

### SWEETS

- **必要数:** 2〜3枚
- **用途:** プリン・焼き菓子・新作スイーツ等の魅力を伝える
- **必要な写真:**
  - プリン
  - 焼き菓子
  - 10月新作スイーツ（情報確定後）
  - コーヒーとの組み合わせ写真
- **望ましい条件:**
  - 実際に提供している商品であること
  - 商品名・提供状況が公開時点で一致していること
- **現在の状態:** 未確定
- **現行仮素材:** AI生成・加工素材のため本番使用不可
- **参考候補:**
  - `images/source/classic-caramel-pudding.png`
  - `images/source/coffee_and_caramel_pudding.png`
  - `images/source/coffee_and_pound_cake.png`
  - `images/source/iced_latte_and_pound_cake.png`
  - `images/source/strawberry-cream-coffee.png`
  - `images/web/pudding.jpg`
- **正式採用:** クライアント追加写真受領後に決定

### SPACE

- **必要数:** 1〜2枚
- **用途:** 店内の空間・木のカウンター・雰囲気を伝える
- **必要な写真:**
  - 店内ワイド
  - カウンター
  - 店内の特徴が伝わる写真
- **望ましい条件:**
  - 空間全体が把握できる
  - 店内の実際の雰囲気を損なわない
  - 横長利用しやすい写真を優先
- **現在の状態:** 未確定
- **現行仮素材:** AI生成・加工素材のため本番使用不可
- **参考候補:**
  - `images/source/bashiiin-coffee-bar-interior.png`
  - `images/web/interior-counter.jpg`
  - `images/web/hero-bar-interior.jpg`
- **正式採用:** クライアント追加写真受領後に決定

### CULTURE

- **必要数:** 1〜3枚
- **用途:** グッズ・ギフト・イベント・カッピング等のBashiiin!らしい文化を伝える
- **必要な写真:**
  - オリジナルグッズ
  - コーヒー商品・ギフト
  - イベント・カッピング
- **望ましい条件:**
  - 現在実際に扱っているもの・実施している内容であること
  - カラフルな商品はUI側の色数を増やしすぎず写真側で見せる
- **現在の状態:** 未確定
- **現行仮素材:** AI生成・加工素材のため本番使用不可
- **参考候補:**
  - `images/source/colorful_drip_coffee_bags.png`
  - `images/source/coffee_bean_bags_pair.png`
  - `images/source/gold_coffee_blend_bag.png`
- **正式採用:** クライアント追加写真受領後に決定

### INSTAGRAM

- **必要数:** 4〜6枚程度
- **用途:** 店舗の最新情報・世界観を視覚的に見せ、Instagramへ誘導する
- **方針:**
  - HERO / COFFEE / SWEETS / SPACE / CULTURE で採用した写真から代表画像を再利用してよい
  - 専用写真を追加する必要はない
- **現在の状態:** 未確定
- **現行仮素材:** AI生成・加工素材のため本番使用不可
- **正式採用:** 他セクションの採用画像確定後に選定

### CONTACT

- **必要数:** 0枚
- **用途:** 問い合わせフォーム
- **方針:** 写真を使わず、可読性・信頼感・操作性を優先
- **現在の状態:** 画像不要

### HEADER / FOOTER / BRAND

- **必要数:** ロゴ一式
- **用途:** Header / Footer / favicon 等
- **現在の状態:** 既存ロゴを利用候補
- **候補ファイル:**
  - `images/bashiiin-coffee-header-logo-white-transparent.png`
  - `images/bashiiin-coffee-footer-logo-white-transparent.png`
  - `images/bashiiin-coffee-primary-logo-white-transparent.png`
  - `images/web/logo-header.png`
  - `images/web/logo-footer.png`
  - `images/web/logo-primary.png`
  - `images/web/favicon.png`
- **注意:** 正式版が白・生成り基調になるため、白ロゴが視認できない場合は正式な黒・濃色ロゴ素材を用意するか、既存ロゴの使用方法を調整する
- **正式採用:** デザイン実装時に背景色とのコントラストを確認して決定

---

## 3. 現在の画像の扱い

### 現在の `images/source/`

現時点の画像はすべて、

> Instagram掲載画像をもとに生成AIで加工・生成した仮素材

として扱う。

そのため、

- デザインリファレンス
- レイアウト検証
- 仮実装
- 写真比率の確認

には使用してよいが、**正式公開には使用しない。**

### 現在の `images/web/`

営業サンプルで使用している画像を含むが、正式版では本番素材として確定しない。

正式写真受領後に、

1. 候補比較
2. 採用決定
3. 自然なWeb用レタッチ
4. リサイズ
5. 圧縮
6. ファイル名整理
7. `images/web/` へ配置

の順で差し替える。

---

## 4. 正式写真受領後の選定フロー

1. クライアントから受領した写真を `images/source/client-new/` に保存
2. 写真を以下のカテゴリに分類
   - 店内
   - 外観・入口
   - コーヒー・抽出
   - 豆
   - スイーツ
   - グッズ・イベント
   - 人物
3. 各セクションの候補を2〜3枚まで絞る
4. Desktop / Mobile のデザインリファレンスと照合
5. HERO写真を最優先で決定
6. COFFEE / BEANS / SWEETS / SPACE / CULTUREを決定
7. Instagram用画像を既採用写真から選定
8. 必要な写真だけ自然なレタッチを実施
9. Web用に最適化して `images/web/` へ配置
10. `asset-map.md` の状態を「確定」に更新

---

## 5. Codex / 実装担当へのルール

- `状態: 未確定` の画像を正式素材として勝手に確定しない
- 現在のAI生成画像は仮実装専用とする
- クライアントから正式写真が届く前に、画像に依存してレイアウトを固定しすぎない
- 写真差し替えで崩れないCSS設計にする
- `object-fit` / `aspect-ratio` 等を使い、候補画像変更に耐えられる構造にする
- AI生成画像を本番公開に残さない
- 正式写真の内容を生成AIで作り変えない
- レタッチは明るさ・色味・ノイズ・シャープネス等の軽微な補正に限定し、構図・被写体・内容は維持する

---

## 6. 現在の進行判断

**現時点では画像選定を確定しない。**

正式写真が未受領のため、実装は以下の状態で進める。

- レイアウト・セクション構成: 実装を進めてよい
- デザインリファレンス: 使用してよい
- 現在のAI生成画像: 仮表示のみ
- 本番採用画像: 未確定
- 最終写真選定: クライアント写真受領後
- 本番公開: AI生成画像が残っていないことを確認してから実施
