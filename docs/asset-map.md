# Bashiiin! coffee 画像管理表

更新：2026-10-28 / STEP 08-A。現在の5ページHTMLの `img src` / `srcset`、faviconを解析した使用一覧です。CSSの `url()` とJavaScriptの画像パス参照も確認しました。画像の生成・変更・削除は行っていません。

## 基準・掲載許可

- [要件定義書v1.6](requirements/requirements_v1.6_2026-10-13.md)、[デザイン定義書v1.6](design/design-system_v1.6_2026-10-13.md)、最新のユーザー指示・現行5ページ実装を基準とします。
- 正式写真は原本が `images/formal ver/` に存在する店舗提供写真と、その原本から作成したWeb最適化版に限定します。保存先が `images/web/` でも原本との対応が確認できれば使用可能です。AI生成・AIによる内容改変・出所不明の旧写真は使用しません。
- ロゴ・ワードマーク・favicon等のブランド素材のみ原本フォルダ制限の例外です。
- ユーザーから「新規画像ファイル全て使用可能」との制作使用許可回答があります。ただし、リポジトリ内に個別の権利・撮影元・人物を含む被写体の掲載許可・最終公開承認の証跡が揃っていることまでは確認できません。以下の全採用写真・ブランド素材の最終掲載許可状態は**要確認**とします。実ファイルの存在・原本との対応確認だけで「店舗承認済み」とは記載しません。
- 元写真を上書き・移動・rename・削除せず保持します。今後派生画像が必要な場合は事前に必要性・保存先を確認し、別ファイルとして生成し、この表へ記録します。

## 現在の使用写真（分類B：正式原本由来のWeb最適化版）

配信パスはリポジトリルート基準。各行の3サイズはすべて現在のHTMLから参照され、Git追跡済みです。実際の寸法・形式も確認しました。原本はすべて `images/formal ver/` 配下です。

| 使用ページ | セクション・順序 | 配信用ファイル（3サイズを列挙） | 原本ファイル | 実内容 | 使用／許可状態 |
|---|---|---|---|---|---|
| TOP | HERO 1 | `images/web/hero/DSC_0052-400.webp`<br>`images/web/hero/DSC_0052-800.webp`<br>`images/web/hero/DSC_0052-1450.webp` | `DSC_0052.webp` | コーヒー入りサーバー・グラス・店舗カード | 使用中／最終掲載許可は要確認 |
| TOP | HERO 2 | `images/web/hero/coffee-packages-400.webp`<br>`images/web/hero/coffee-packages-800.webp`<br>`images/web/hero/coffee-packages-1206.webp` | `829940080_1786515612391095_3237499876071483915_n.webp` | ロゴ入りパッケージ | 使用中／最終掲載許可は要確認 |
| TOP | HERO 3 | `images/web/journal/spoon-400.webp`<br>`images/web/journal/spoon-800.webp`<br>`images/web/journal/spoon-1206.webp` | `830324349_4550763371904964_7100813407432157579_n.webp` | 木のテーブルと金属のスプーン | 使用中／最終掲載許可は要確認 |
| TOP | HERO 4 | `images/web/journal/DSC_0132-400.webp`<br>`images/web/journal/DSC_0132-800.webp`<br>`images/web/journal/DSC_0132-1450.webp` | `DSC_0132.webp` | 氷入りドリンク・焼き菓子・カード | 使用中／最終掲載許可は要確認 |
| TOP | HERO 5 | `images/web/journal/coffee-pouring-400.webp`<br>`images/web/journal/coffee-pouring-800.webp`<br>`images/web/journal/coffee-pouring-1206.webp` | `833135303_1893980718650582_7245257760060958267_n.webp` | ミルクと氷入りグラスへコーヒーを注ぐ手元 | 使用中／最終掲載許可は要確認 |
| ABOUT | SPACE | `images/web/space/DSC_0167-400.webp`<br>`images/web/space/DSC_0167-800.webp`<br>`images/web/space/DSC_0167-1450.webp` | `DSC_0167.webp` | カウンター・テーブル・コーヒー器具のある店内 | 使用中／最終掲載許可は要確認 |
| ABOUT | SWEETS | `images/web/sweets/R0000476-400.webp`<br>`images/web/sweets/R0000476-800.webp`<br>`images/web/sweets/R0000476-1920.webp` | `R0000476.webp` | プリン・皿・スプーン | 使用中／最終掲載許可は要確認 |
| ABOUT | CULTURE | `images/web/culture/DSC_0165-400.webp`<br>`images/web/culture/DSC_0165-800.webp`<br>`images/web/culture/DSC_0165-1450.webp` | `DSC_0165.webp` | レンガ壁とイラスト入りTシャツ | 使用中／最終掲載許可は要確認 |
| COFFEE | メイン写真 | `images/web/coffee/coffee-preparation-400.webp`<br>`images/web/coffee/coffee-preparation-800.webp`<br>`images/web/coffee/coffee-preparation-1206.webp` | `836650886_1839293087060384_1504843703391329726_n.webp` | ドリッパー・サーバー・ポットとコーヒーを準備する手元 | 使用中／最終掲載許可は要確認 |
| ACCESS | 入口看板 | `images/web/hero/entrance-sign-400.webp`<br>`images/web/hero/entrance-sign-800.webp`<br>`images/web/hero/entrance-sign-1206.webp` | `835355627_2191449308084144_6214797320265951783_n.webp` | 店舗ロゴと2階への案内がある入口看板 | 使用中／最終掲載許可は要確認 |

HERO表示順は表の1〜5です。`journal/` の3点は現在TOPのみ、`hero/entrance-sign-*` は現在ACCESSのみで使っています。フォルダ名だけで現在の用途を判定せず、既存パスは維持します。独立したINSTAGRAM / JOURNAL写真セクションは現行5ページにはありません。

- ABOUT：SPACE → SWEETS → CULTURE。写真順序を維持しています。
- COFFEE：準備の写真1点。CURRENT BEANSは確認済みの豆情報・専用写真未反映の案内で、写真なし。HEROのパッケージ写真から現在の商品・在庫を推測しません。
- CONTACT：本文写真なし。共通HEADER / FOOTERのロゴとfaviconのみ。
- 写真10点・WebP 30ファイル。分類A（原本直接参照）0、B 30、C（後述のブランド素材）2、D（正式原本との対応がない採用写真）0。権利の最終確認完了を意味する集計ではありません。

## 派生サイズ・形式・生成記録

各原本に対する既存READMEの生成記録を引き継ぎ、下記SHA-256 10件が現在の原本と一致することを確認しました。配信ファイルは実形式WebPで、各 `srcset` の幅指定が実寸幅と一致します。既存生成記録は品質84・向きの正規化・EXIF除去・リサイズで、AI加工・色調変更・原本拡大なしです。今回再生成・再圧縮はしていません。

原本17件は拡張子が `.webp` ですが、実形式はJPEGです。拡張子の修正や原本の上書きは行いません。Web表示用30ファイルは実形式もWebPです。

| 配信用の基底パス | 幅×高さ（px） | 原本寸法（px） | 原本SHA-256 |
|---|---|---|---|
| `images/web/hero/DSC_0052` | 400×265 / 800×530 / 1450×960 | 1450×960 | `07507bab2cd14abd241b538e6cbffd83bc4dedc9ba146a99c5c54d957eb0ad5a` |
| `images/web/hero/coffee-packages` | 400×600 / 800×1200 / 1206×1809 | 1206×1809 | `fa4c53c02a01fa59bf34cdbc2792c2610f2742376b6920c2cb1bd038b804d45a` |
| `images/web/journal/spoon` | 400×600 / 800×1200 / 1206×1809 | 1206×1809 | `ce0d341a89a895ad9a709a006fa0218eb3c503d12f21be095a9b09a432fdc2af` |
| `images/web/journal/DSC_0132` | 400×265 / 800×530 / 1450×960 | 1450×960 | `5a72bf5c5642d9bb8ef99ddc4f8657f37e535c1e19bbb0e7623d669ddd4319fa` |
| `images/web/journal/coffee-pouring` | 400×265 / 800×529 / 1206×798 | 1206×798 | `abdbddc69ac46e578ec637230ce2eba1aa8936aed8073cd9f312b83b9b9fa115` |
| `images/web/space/DSC_0167` | 400×265 / 800×530 / 1450×960 | 1450×960 | `ecccbd75db17ad4ffd42d3ad75686fa775097bb8efdeeb11019137a4a71d70a6` |
| `images/web/sweets/R0000476` | 400×267 / 800×533 / 1920×1280 | 1920×1280 | `b88bff4c7c22eb38e40f3a73ec7427df1affd95b0a173966757526525c6f912e` |
| `images/web/culture/DSC_0165` | 400×265 / 800×530 / 1450×960 | 1450×960 | `400a7e2890118d2b60ca83caf3bcd6dce89af812a39564592db5a6caf1f27bb1` |
| `images/web/coffee/coffee-preparation` | 400×265 / 800×529 / 1206×798 | 1206×798 | `91de56aa925f761a15ae59af840f955ffebab98e7d0cd9a5904f30e4a31a0cca` |
| `images/web/hero/entrance-sign` | 400×600 / 800×1200 / 1206×1809 | 1206×1809 | `d298a50112f3fbed38d41a9e66539fe29a804c1ed8dd66a90175d79324d6fdc3` |

## 共通ブランド素材（分類C）・アイコン

| 使用ページ・場所 | 配信ファイル | 寸法 | 由来・状態 |
|---|---|---|---|
| 全5ページのHEADER / FOOTER | `images/web/logo-header.png` | 400×104px | 既存ブランド素材・Git追跡済み。正式使用継続可否・最終掲載確認は要確認 |
| 全5ページのfavicon | `images/web/favicon.png` | 64×58px | 既存ブランド素材・Git追跡済み。正式使用継続可否・最終掲載確認は要確認 |

ロゴの繰り返し使用は共通ブランド表示のためです。Lucide系arrow-right / arrow-up-right / menu / xは各HTML内のinline SVGで、外部画像ファイル・CDN参照はありません。ライセンスコメントを各HTMLに保持しています。

## 重複・読み込み・実参照の確認

- 異なるページ／セクション間の同一写真の重複はありません。各写真のサイズ違いはレスポンシブ表示用です。
- HEROのループ複製は同じ写真列の実装上の複製で、別セクションへの再利用ではありません。複製は読み上げ・focusから除外されます。
- `src` は最大サイズを指定し、各写真に400 / 800 / 原本幅の `srcset` と `sizes` を設定。全本文写真にwidth / heightがあります。
- TOP / ABOUT / COFFEEはページ先頭主写真だけ `fetchpriority="high"`。ほかの本文写真は `loading="lazy"`。ACCESS看板もlazyです。
- 5 HTML全体で写真10要素＋共通ロゴ10要素、favicon 5参照。重複を除いた実ファイルは32。`picture` / `source` の画像参照は現在ありません。CSSの背景画像・JavaScriptの写真パス参照もありません。
- 32ファイルすべて存在し、すべてGit追跡済み。今回、追加が必要な未追跡の配信用素材はありません。未使用素材を配信画像と混同しません。
- 上記は静的な参照・寸法確認です。全6幅の実ブラウザー最終QA・表示品質／実機検証の完了を意味しません。

## 原本17件の使用／未使用一覧

採用10原本は上の対応表を参照。以下7原本は現在の表示用写真の生成元として採用していません。原本を削除・Git一括追加・本番配信しません。

| 未使用原本（images/formal ver/） | 内容・扱い |
|---|---|
| `830416943_1686497192996545_8268471576687266553_n.webp` | グラスの層状スイーツ。正式商品名・提供情報未確認のため保留。 |
| `831183319_1430301269249591_8222574010323692921_n.webp` | Tシャツの同カット別サイズ。高解像度DSC_0165を採用。 |
| `833271010_1402944518670214_7334833199519804194_n.webp` | サーバー・グラスの同カット別サイズ。DSC_0052を採用。 |
| `834720508_1439441991453605_1079492859231359163_n.webp` | 店内の同カット別サイズ。DSC_0167を採用。 |
| `835657091_2283790962443589_2894471994776161918_n.webp` | ドリンク・焼き菓子の同カット別サイズ。DSC_0132を採用。 |
| `836500267_1085156011078265_5022858138063918314_n.webp` | プリンの同カット別サイズ。R0000476を採用。 |
| `R0002506.webp` | グラスの層状スイーツ。正式商品名・提供情報未確認のため保留。 |

## 未使用のWeb画像・旧素材

`images/web/` の実ファイル71件中、現行5 HTMLから未参照のファイルは39件です。削除はせず保持します。原本・旧素材・未使用派生画像は本番配信対象から除外します。

以下は現行サイトでは未使用です。Git履歴や営業サンプルでの使用確認なしに削除しません。

- `images/web/brewing-station.jpg`
- `images/web/building.jpg`
- `images/web/coffee-cup.jpg`
- `images/web/culture/tshirt-1450.jpg`
- `images/web/culture/tshirt-400.jpg`
- `images/web/culture/tshirt-800.jpg`
- `images/web/dark-wood-texture.jpg`
- `images/web/entrance-door.jpg`
- `images/web/hand-drip.jpg`
- `images/web/hero-bar-interior-mobile.jpg`
- `images/web/hero-bar-interior.jpg`
- `images/web/hero/brewing-station-400.jpg`
- `images/web/hero/brewing-station-640.jpg`
- `images/web/hero/coffee-cup-400.jpg`
- `images/web/hero/coffee-cup-640.jpg`
- `images/web/hero/entrance-door-400.jpg`
- `images/web/hero/entrance-door-640.jpg`
- `images/web/hero/hand-drip-400.jpg`
- `images/web/hero/hand-drip-640.jpg`
- `images/web/hero/interior-counter-400.jpg`
- `images/web/hero/interior-counter-640.jpg`
- `images/web/hero/pudding-400.jpg`
- `images/web/hero/pudding-640.jpg`
- `images/web/interior-counter.jpg`
- `images/web/journal/drink-1200.jpg`
- `images/web/journal/drink-400.jpg`
- `images/web/journal/drink-800.jpg`
- `images/web/journal/interior-1200.jpg`
- `images/web/journal/interior-400.jpg`
- `images/web/journal/interior-800.jpg`
- `images/web/journal/pudding-1200.jpg`
- `images/web/journal/pudding-400.jpg`
- `images/web/journal/pudding-800.jpg`
- `images/web/logo-footer.png`
- `images/web/logo-primary.png`
- `images/web/moody-hand-drip-coffee.jpg`
- `images/web/pudding.jpg`
- `images/web/space/interior-counter-1240.jpg`
- `images/web/space/interior-counter-1800.jpg`

さらに `images/formal ver/web/` の旧JPEG派生18件、`images/source/` の旧素材・AI仮素材、`images/` 直下の未参照ブランド原稿も現行サイトの配信対象には含めません。`images/source/` はignore設定があっても既存追跡ファイルがあるため、Git管理状態を個別に確認します。写真原本17件と旧JPEG派生の一部は未追跡のまま保持し、今回保存候補には含めません。

## JSON-LD / OGP候補

- TOPのJSON-LDには現在 `image` / `logo` はありません。正式ドメイン未確定のため、本番絶対URLを推測して追加しません。
- image候補：`images/web/space/DSC_0167-1450.webp`、`images/web/hero/DSC_0052-1450.webp`。対応原本は上表のとおりです。
- logo候補：`images/web/logo-header.png`（ブランド例外）。
- OGP写真候補：`images/web/hero/DSC_0052-1450.webp`。選定・比率・本番絶対URL・最終承認は要確認。OGP画像は今回作成・確定していません。
- 原本や未使用画像、入力資料 `bashiiin_coffee_jsonld.html` をそのまま本番配信しません。正式な配信対象限定は後続のCloudflare Workers Static Assets実装で行います。既存GitHub Pages workflowは5ページ版へ流用しません。
