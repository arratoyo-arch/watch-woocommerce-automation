# watch-woocommerce-automation

このリポジトリは **WooCommerce / watch-tokyo.com 商品 draft 作成・商品管理専用** の Google Apps Script リポジトリです。

`watch-ebay-automation` と `watch-woocommerce-automation` は、目的・コード・関数名・シート名・API設定・運用責務を完全に分離します。相互に運用上の情報を参照してよいですが、実装責務は混在させません。

---

## 関連リポジトリ

| リポジトリ | 役割 |
| --- | --- |
| `watch-ebay-automation` | eBay収益化専用 |
| `watch-woocommerce-automation` | WooCommerce draft / 商品管理専用 |

* 2つのリポジトリは相互に参照してよいです。
* ただし、コード責務・API更新処理・シート本体管理・関数責務は混在させません。
* WooCommerce は eBay 収益化の補助情報になり得ますが、`watch-ebay-automation` 側に WooCommerce API POST/PUT や Woo draft 作成ロジックを入れません。
* eBay の販売管理・価格変更・Active listing 本体処理は `watch-ebay-automation` 側で扱い、このリポジトリには入れません。

---

## watch-woocommerce-automation の目的

このリポジトリの目的は、**WooCommerce / watch-tokyo.com の商品 draft 作成、未出品モデル管理、商品説明文、タイトル、カテゴリ、タグ、画像準備、商品管理** を担当することです。

主な対象は以下です。

* `Woo_Products`
* `WC_Keep_Active`
* `WC_Todo_Check`
* `WDB_Next_Sales_Candidates`
* `WC_Products`（旧名・互換参照が必要な場合のみ。新規実装では使用しない）
* WooCommerce API
* Woo Draft Bridge / WDB

---

## watch-woocommerce-automation でやること

1. WDB モデル番号による WooCommerce draft 候補作成
2. 未出品モデルのみ新規 draft 化
3. タイトル・説明文・価格・タグ・カテゴリ作成
4. 画像 550x550 準備
5. Free shipping 前提の商品説明作成
6. WooCommerce 商品データの取得・確認
7. `WC_Keep_Active` を使った SKU・価格・在庫の半自動更新
8. `Woo_Products` による更新結果確認

---

## customer friendly 改善方針

watch-tokyo.com は大規模リニューアルではなく、WooCommerce draft 作成時点の説明文・短い説明・タグ・メタデータを整えることで、購入前の不安を低リスクに減らします。

### 現状分析

* 既存の draft 作成フローは `status: draft` を使っており、公開前に人間が確認できる安全な流れです。
* Free shipping の記載はありますが、短い説明と本文で表現が統一されていない場合があります。
* New / unused、Ships from Japan、JDM、customs / import duties、Before Purchase の注意がセクション化されていないと、海外購入者が重要情報を見落とす可能性があります。
* 画像、価格、在庫、カテゴリ、最終説明文は公開前に必ず確認する前提を維持します。

### すぐ改善すべき点

* short description に New / unused、Japan domestic model / JDM、Free international shipping from Japan を明記します。
* product description は `Model`、`Brand`、`Series`、`Key Features`、`Condition`、`Shipping`、`Customs / Import Duties`、`Before Purchase`、`Note` の順に統一します。
* meta_data に shipping note、condition note、customs note、publish checklist を残し、公開前レビューで確認できるようにします。
* tags に `Ships from Japan`、`Free Shipping`、`New Unused` など、購入者が理解しやすい補助タグを追加します。

### 実装した方がよい改善

* WDB 由来の全 draft 作成テンプレートを同じ customer friendly 構成に寄せます。
* 画像未設定の商品は公開前チェックで止め、画像準備後に公開します。
* スペック不足時は断定せず、`Please check the model number, specifications, size, and compatibility before purchase.` を必ず入れます。
* Shipping / Customs / Returns / FAQ は固定ページまたはサイト導線で確認しやすくします。

### 実装しない方がよい改善

* 既存公開商品の大量本文更新。
* 価格変更、在庫変更、注文処理、決済設定変更。
* テーマの大幅変更やサイト全体リニューアル。
* WooCommerce 側から他販売チャネルの出品・価格・広告を操作する処理。

### 商品説明テンプレート

```text
Model: XXXXX

Brand: XXXXX
Series: XXXXX

Key Features:
* Japan domestic model / JDM
* Authentic product sourced from Japan
* Main features here

Condition:
New / unused item sourced from Japan.

Shipping:
Free international shipping from Japan.
We carefully pack and ship the item with tracking.

Customs / Import Duties:
Import duties, taxes, and customs fees may be charged by your country and are the buyer's responsibility where applicable.

Before Purchase:
Please check the model number, specifications, size, and compatibility before purchase.
If you have any questions, please contact us before ordering.

Note:
This is a draft product. Please confirm price, stock, images, categories, and final description before publishing.
```

### Shipping / Customs / Returns / FAQ 文面案

* Shipping: `We ship from Japan with tracking. Free international shipping is included for eligible products unless otherwise stated on the product page.`
* Customs: `Import duties, taxes, and customs fees may be charged by your country and are the buyer's responsibility where applicable.`
* Returns / cancellation: `Please contact us as soon as possible if there is an issue with your order. Return eligibility depends on item condition, timing, and the reason for return.`
* FAQ: `Before purchasing, please check the model number, specifications, size, and compatibility. If you are unsure, please contact us before ordering.`

### 変更リスク

* 説明文の改善は draft 作成時の表示改善が中心のため低リスクです。
* WooCommerce API の公開商品一括更新ではないため、既存公開商品の価格・在庫・注文には影響しません。
* ただし、公開前に価格、在庫、画像、カテゴリ、スペック、英語表現を人間が確認する必要があります。


---

## watch-tokyo.com customer-friendly site copy policy

watch-tokyo.com should reduce overseas customer anxiety with small, low-risk content improvements that can be manually reviewed before publication. The detailed page copy and product-page trust block are maintained in [`docs/customer-friendly-pages.md`](docs/customer-friendly-pages.md).

Recommended manual site placement:

* Home: add a “Why Buy from Watch Tokyo?” section.
* Footer: add About / Shipping / Customs / Returns / FAQ / Contact links.
* Product page: clearly state Condition / Shipping / Customs / Before Purchase.
* WDB draft: before publishing, a human must confirm price, stock, images, category, specifications, and final description.
* WooCommerce supports the broader watch business, but this repository should prioritize low-risk customer-friendly improvements rather than large site rebuilds or bulk production updates.

The shared product-page trust block should include:

```text
Condition:
New / unused item sourced from Japan.

Shipping:
Free international shipping from Japan with tracking.
We carefully pack and ship the item from Japan.

Customs / Import Duties:
Import duties, taxes, and customs fees may be charged by your country and are the buyer's responsibility where applicable.

Before Purchase:
Please check the model number, specifications, size, color, functions, and compatibility before purchase.
If you have any questions, please contact us before ordering.

Note:
Please confirm the product images, model number, and specifications before purchase.
```

---

## watch-woocommerce-automation でやらないこと

1. eBay `Active_listing` の本体管理
2. eBay価格変更
3. eBay Promoted Listing変更
4. eBayログイン自動化
5. eBay API出品更新
6. eBay Trading API / Sell Similar / 売上分析の本体処理
7. eBay seller operations の関数・シート・API更新処理の追加

これらは `watch-ebay-automation` の責務です。

---

## WooCommerce側の前提

* watch-tokyo.com は Free shipping 前提です。
* `publish` / `draft` / `pending` に既存モデルがある場合、そのモデルは新規 draft 対象外です。
* 更新は半自動・人間レビュー・preview-before-production・selected-rows-only を維持します。
* 初回の実運用は 5〜10 行程度の小さい単位で行います。

---

## watch-ebay-automation の責務（参照用）

`watch-ebay-automation` は **eBay販売の収益化、売上増加、利益率改善、価格上げ、補充判断、在庫リスク確認** を最優先する専用リポジトリです。

### 主な対象

* `Active_listing`
* `My_sale`
* `Listing_plan`
* `EBAY_Revenue_Priority`
* eBay API
* Promoted Listing
* 価格上げ候補
* 補充候補
* 終了候補

### やること

1. Active listing 分析
2. Sold実績分析
3. Views / Watchers / R / Days による収益化判定
4. 価格上げ候補抽出
5. Restock候補抽出
6. 在庫確認候補抽出
7. eBay出品改善候補作成

### やらないこと

1. WooCommerce draft作成
2. watch-tokyo.com 商品登録
3. WooCommerce API POST/PUT
4. Woo商品説明文生成を主目的にした処理

---

## 収益化優先順位（watch-ebay-automation）

`watch-ebay-automation` では、以下の順番で eBay 収益化を優先します。

1. 価格上げ候補
2. 売れ筋補充候補
3. 在庫切れ・販売終了チェック
4. 出品改善
5. 新規出品候補
6. WooCommerce連携は対象外

短縮表現では、以下の優先順位です。

```text
価格上げ > 売れ筋補充 > 在庫確認 > 出品改善 > 新規出品 > WooCommerce連携対象外
```

---

## ファイル責務

### watch-woocommerce-automation

| ファイル | 責務 |
| --- | --- |
| `woocommerce.gs` | WooCommerce API 接続、商品取得、SKU・価格・在庫更新、preview-before-production、`Woo_Products` / `WC_Keep_Active` ワークフロー |
| `woo_draft_bridge.gs` | 外部のread-only処理から受け取った中立的な候補行と、完全取得済みのWoo商品配列を照合するPreview-only処理 |
| `utils.gs` | 共通ユーティリティ、入力検証、シート補助、ログ補助など |
| `README.md` | 運用目的、リポジトリ分離、シート責務、安全運用ルール |
| `AGENTS.md` | Codex が恒久的に守る開発・運用ガードレール |

### Preview-only Woo Draft Bridge

`buildWooDraftBridgePreview(sourceRows, wooProducts, options)` は純粋なPreview builderです。APIやSpreadsheetを呼ばず、商品作成・更新・Publishも行いません。呼び出し側がWoo商品の `publish`、`draft`、`pending` を完全取得できた場合だけ `options.wooFetchComplete: true` を指定します。`wooProducts` は密な配列で、各要素が非nullの非配列object、`status` がWoo APIの正式な小文字値 `publish` / `draft` / `pending` のいずれかと完全一致し、かつ `sku`、`model`、`modelNumber`、`model_number`、`name` から一意で実際に照合可能なmodelKeyを取得できる必要があります。modelKeyはNFKC・大文字化・空白と一般的なハイフンの除去後に5文字以上で、英字と数字を最低1文字ずつ含むものだけを許可します。商品名由来のidentityは、そのPreviewに含まれる有効なsource modelとの境界付き完全一致だけから取得し、任意の商品名トークンを新しいmodel identityとして推測しません。suppliedされたSKU・直接型番の不正値、複数の異なるsource modelとの商品名一致、各識別情報間の矛盾、source modelと一致しないname-only商品は拒否します。ただしgenericなnameや仕様表現だけのnameは、有効で矛盾のないSKUまたは直接型番が別にあれば許可します。statusの前後空白、大文字・小文字違い、全角化、不明値、異常型は正規化・推測せず拒否します。既知フィールドの異常型、疎要素、null、primitive、配列要素、識別情報のないobjectはindexと理由をerrorsへ記録し、スナップショット全体を不完全として照合に使用しません。正常な空配列は完全取得結果として許可します。取得不完全、warnings/errorsあり、または全入力行のaccounting不一致の場合はfail-closedとなり、`readyForDraftSelection` は `false`、`firstFiveCandidates` は空になります。

各入力行は `newDraftCandidates`、`existingWooProducts`、`duplicates`、`excludedRows`、`invalidModels`、`unresolvedRows` のいずれか1つに分類されます。中立的なsource rowには、信頼できる商品種別証拠から呼び出し側が設定した構造化フィールド `productType` が必須です。NFKC・大文字化・trim後の完全一致で `WRISTWATCH` または `腕時計` だけを安全な腕時計として許可します。`CALCULATOR`、`CLOCK`、`ACCESSORY`など明示的な非腕時計値は `excludedRows`、空欄や未知値は理由付きで `unresolvedRows` に入ります。title、categories、モデル番号、ブランド名だけから腕時計とは推測しません。対象ブランドも構造化された文字列 `brand` または `maker` だけから判定し、NFKC・大文字化・trim後に `CASIO`、`CITIZEN`、`SEIKO`、`ORIENT` のいずれかと完全一致する必要があります。titleからブランドを推測しません。両フィールドが異なる場合、欠落・異常型の場合は `unresolvedRows`、明示的な対象外ブランドは `excludedRows` に分類します。

安全な候補には、対象ブランド、明示的な新品condition、許可された `productType`、有効な構造化モデル番号、商品名、`price`、`images`、完全な `descriptionContent`、`categories`、`tags`、`stockPolicy`、`shippingPolicy` のすべてが必要です。source modelは `model`、`modelNumber`、`model_number` の構造化値を優先し、欠落時にtitle内の仕様表現から推測しません。商品名は `title`、`name`、`productName` の優先順位で、最初のtrim後非空の文字列だけを採用します。boolean、number、array、objectは商品名として文字列化しません。採用した商品名はPreview候補の `productName` に保持します。

source model aliasは、存在する `model`、`modelNumber`、`model_number` の全値を検証します。各aliasはtrim後非空の文字列、または全要素が実在するtrim後非空文字列である密な配列でなければならず、null、undefined、number、boolean、object、入れ子配列、空配列、疎配列、無効な型番文字列を黙って破棄しません。全alias・全要素が有効なmodel identityで、同じmodelKeyを示す場合だけ表記差を許可します。無効値を含む行は理由付きで `invalidModels`、異なる有効modelKeyを含む行は `unresolvedRows` に一度だけ分類し、後続aliasの有効値で先行aliasの不正値を隠しません。

文字列の `price` はNFKCとtrim後にASCII数字による符号なし10進整数または、小数点の前後に数字がある10進小数だけを許可します。このため前後の通常空白・タブ・全角空白と全角数字は正規化後に許可されますが、0、負数、先頭の `+`、16進・2進・8進、指数表記、`.5`、`1.`、通貨記号、通貨単位、桁区切りは拒否します。number型も有限かつ0より大きい値だけを許可し、boolean、array、objectは拒否します。価格aliasは `price`、`regularPrice`、`regular_price` の順、画像aliasは `images`、`imageUrls`、`image_urls`、`image` の順に各値を検証し、最初の有効値を採用します。無効な先行aliasは有効な後続aliasを遮りません。採用値とaliasは候補の `price` / `priceAlias`、`images` / `imagesAlias` に保持します。価格換算や画像へのネットワークアクセスは行いません。

`images` は非空文字列または非空の `src` / `url` を持つ要素が最低1件、`stockPolicy` と `shippingPolicy` はtrim後に非空の文字列を要求します。呼び出し側は説明の根拠となる構造化object `descriptionContent` を渡します。`descriptionContent.model` はsource modelと同じmodelKey、`descriptionContent.brand` は構造化source brandと完全一致し、`series` はtrim後2文字以上の文字列、`keyFeatures` はtrim後2文字以上の文字列またはそのような文字列要素を含む配列、`condition` は許可された新品値でなければなりません。`japanDomesticModel`、`authenticFromJapan`、`freeInternationalShippingFromJapan`、`trackingAndCarefulPacking`、`customsBuyerResponsibility`、`buyerChecksModelSpecificationsSizeCompatibility`、`contactBeforeOrdering`、`humanConfirmationBeforePublish` は、呼び出し側が根拠を確認した場合だけ個別に厳密なboolean `true` を設定します。全要素が検証できた場合だけ、Preview builderがModel、Brand、Series、Key features、新品状態、JDM、日本からの正規品、国際送料無料、追跡・梱包、関税責任、購入前確認、事前問い合わせ、Publish前の人間確認を明記した標準本文を純粋に構築し、候補の `description` に保持します。元の `row.description` は完成本文として信用せず、存在する場合は確認用の `sourceDescription` にだけ保持します。不足内容は推測せず、`missingDescriptionFields` と `missingFields` に個別記録します。`categories` と `tags` は配列とし、非空文字列、非空の `name`、または正の数値・非空文字列の `id` を持つ要素が最低1件必要です。通常空白、タブ、改行、全角空白だけの文字列や空要素だけの配列も不足扱いです。不足行は `unresolvedRows` に一度だけ分類され、`newDraftCandidates` と `firstFiveCandidates` には入りません。画像URLへのアクセス、Woo Draft作成・更新・Publishは行いません。

Woo商品配列の明示的な型番入力フィールドは `model`、`modelNumber`、`model_number` です。照合はDraft候補の必須項目検証より先に行い、SKU完全一致、明示的な型番完全一致、商品名証拠の順に優先します。このため商品名など候補項目が不足していてもWoo既存商品と一意に照合できた行は `existingWooProducts` になります。商品名証拠は、そのPreviewの有効なsource model集合だけを候補に、NFKC・大文字化と前後英数字境界を使って照合し、空白と一般的なハイフンを除去したmodelKeyの完全一致で判定します。`WR-200M`、`ISO-6425`、`10-Year`、`200-Meter` などsource modelではない仕様トークンを別identityとして推測しません。商品名全体へのsubstring検索は行わず、suffix・色番号・国内型番末尾の省略や長い英数字列の内部一致は拒否します。商品名が異なるsource modelを複数示す場合、複数Woo商品が一致する場合、またはSKU・明示型番・商品名証拠に明確な矛盾がある場合はfail-closedにします。任意の `meta_data` は型番証拠として使用しません。

新品判定は構造化された `condition` または `itemCondition` の明示値だけを使用し、商品名や `category` に含まれる単語 `New` は新品証拠にしません。構造化された `productType` が腕時計の場合、title中の `BAND`、`STRAP`、`BRACELET` は腕時計の特徴表現として扱い、それだけでは除外しません。一方、`Replacement Strap` のような明示的な交換部品表現が腕時計productTypeと矛盾する場合は `unresolvedRows`、`productType=ACCESSORY` は `excludedRows` に分類します。`firstFiveCandidates` は完全な候補から最大5件を提示する人間確認用のDraft選択候補であり、Draft作成指示ではありません。

### watch-ebay-automation（参照用）

| ファイル | 責務 |
| --- | --- |
| `active_listing.gs` | Active listing 取得・分析・重要アクション候補抽出 |
| `sales.gs` | Sold実績 / `My_sale` 分析、販売実績にもとづく判断材料作成 |
| `listing_plan.gs` | `Listing_plan` の候補作成、出品改善・補充・価格戦略の計画化 |
| `ebay_api.gs` | eBay API 接続、認証、eBay 側データ取得・更新の共通処理 |

---

## シート責務

### watch-woocommerce-automation

| シート | 責務 |
| --- | --- |
| `Woo_Products` | WooCommerce API から取得した商品確認シート。SKU、価格、在庫、商品ID、商品名、更新結果の確認に使う |
| `WC_Keep_Active` | WooCommerce 商品管理のメイン作業シート。SKU・価格・在庫更新準備、手動レビュー、選択行のみの半自動更新に使う |
| `WC_Todo_Check` | WooCommerce 商品化や修正の確認待ちタスク管理に使う |
| `WDB_Next_Sales_Candidates` | WDB 由来の次回販売・draft 化候補を管理する |
| `WC_Products` | 旧シート名。新規実装では `Woo_Products` を使い、互換参照が必要な場合だけ README に理由を明記する |

### watch-ebay-automation（参照用）

| シート | 責務 |
| --- | --- |
| `Active_listing` | eBay 出品中商品の本体管理・分析元データ |
| `My_sale` | eBay Sold実績、販売数、利益、需要確認の元データ |
| `Listing_plan` | 出品改善、補充、価格変更、新規候補の計画シート |
| `EBAY_Revenue_Priority` | eBay収益化の優先順位、価格上げ、売れ筋補充、在庫確認候補を整理するシート |

---

## 主要関数

### `exportWooProductsToSheet()`

WooCommerce 商品を取得して `Woo_Products` に書き出します。

使用タイミング:

* レビュー前
* 本番更新後
* WooCommerce の現在値確認時

### `buildWooKeepActiveCandidates()`

`WC_Keep_Active` に WooCommerce 管理候補を作成または更新します。

### `updateWooSkuFromKeepActive()`

`WC_Keep_Active` から SKU のみを更新します。

必須アクション:

```text
WC Update Action = UPDATE_SKU
```

### `previewWooProductsUpdateFromKeepActive()`

価格・在庫の本番更新前に必ず実行する preview 関数です。

確認内容:

```text
Target rows are expected
Warnings: 0
Errors: 0
```

### `updateWooProductsFromKeepActive()`

`WC_Keep_Active` から WooCommerce の価格・在庫を本番更新します。

許可アクション:

```text
UPDATE
UPDATE_PRICE
UPDATE_STOCK
UPDATE_PRICE_STOCK
```

本番更新後は `WC Update Action` をクリアし、`exportWooProductsToSheet()` で結果を確認します。

---

## 安全運用ルール

* 人間が `WC Update Action` を入力した行だけ更新します。
* `WC Update Action` が空の行は必ずスキップします。
* 本番更新前に必ず preview を実行します。
* preview に warnings / errors がある場合は本番更新しません。
* target rows が想定外の場合は本番更新しません。
* 本番更新後は `WC Update Action` をクリアします。
* 更新結果は `exportWooProductsToSheet()` で再取得し、`Woo_Products` で確認します。
* 一括全自動更新には変更しません。

---

## 禁止事項

* eBayリポジトリに WooCommerce POST/PUT 処理を入れない
* WooCommerceリポジトリに eBay価格変更処理を入れない
* WooCommerceリポジトリに eBay Active listing 本体処理を入れない
* WooCommerceリポジトリに eBay Promoted Listing 変更処理を入れない
* 一時的な修正で別リポジトリの処理をコピーしない
* APIキー、consumer secret、access token、refresh token、password を直書きしない
* 動いている既存関数を説明なく削除しない
* preview-before-production ルールを削除しない
* selected-rows-only ルールを削除しない
* human-reviewed の前提を削除しない

---

## Secrets Policy

Secret / API key / refresh token / consumer secret は、README・ソースコード・コメント・ログ・テストデータに書きません。

WooCommerce の認証情報は Google Apps Script Properties に保存します。

使用する Script Properties 名:

```text
WOO_BASE_URL
WOO_CONSUMER_KEY
WOO_CONSUMER_SECRET
```

以下の旧名は新規実装で使いません。

```text
WC_SITE_URL
WC_CONSUMER_KEY
WC_CONSUMER_SECRET
```

---

## 初回本番運用ポリシー

```text
Recommended batch size: 5 to 10 rows
Avoid: 100-row bulk update
Operation style: semi-automatic
Human confirmation: required
```

---

## 確認済み運用状態

```text
WooCommerce API connection: OK
WooCommerce product fetch: OK
Published products fetched: 145
Woo_Products export: OK
SKU registration: OK
SKU registered: 145
SKU blank: 0
WC_Keep_Active workflow: OK
Price and stock preview: OK
Production update: OK
Re-fetch confirmation: OK
Semi-automatic operation: OK
```

---

## Woo Draft Bridge 共通ファイル同期手順

GAS エディタへ手動で共通関数を貼り足さなくても WDB の draft 作成フローを動かせるように、WooCommerce API 設定と共通ヘルパーはリポジトリ上の `utils.gs`、`config.gs`、`woocommerce.gs` を同期元にします。

### GASへ反映するファイル一覧

1. `utils.gs`
2. `config.gs`
3. `woocommerce.gs`

### Script Properties に設定するキー名

以下のキーを Google Apps Script の Script Properties に設定します。値そのものは Secret のため、GitHub、README、コメント、ログ、テストデータには絶対に書きません。

```text
WOO_BASE_URL
WOO_CONSUMER_KEY
WOO_CONSUMER_SECRET
```

`WOO_BASE_URL` は `https://watch-tokyo.com` のようなベース URL を設定します。コード側では末尾スラッシュを除去して使用します。

### Dry Run → Draft作成の実行順

1. GASに `utils.gs`, `config.gs`, `woocommerce.gs` を反映
2. Script Properties に `WOO_BASE_URL`, `WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET` を設定
3. `checkWooCommerceConfig()` を実行
4. wdb対象商品の `dryRunCreateWooDraft_...()` を実行
5. 問題なければ `createWooDraft_...()` を実行
6. WooCommerce側で画像・価格・説明文を確認してからPublish

### 安全運用メモ

* `checkWooCommerceConfig()` は Secret 値をログに出さず、設定済みかどうかだけ確認します。
* Draft 作成関数は `status: draft` の商品作成までに限定し、自動 Publish はしません。
* `findWooProductBySkuOrModel_()` で既存 SKU / 型番を確認してから draft payload を作成します。
* 既存の WDB draft 作成フローと同じ形式で、今後追加する `dryRunCreateWooDraft_...()` / `createWooDraft_...()` から共通ヘルパーを利用します。

---

## Watch Tokyo store structure review docs

The customer-friendly store review is split into focused documentation so the WooCommerce workflow can improve without unsafe bulk updates.

* [`docs/watch-tokyo-store-audit.md`](docs/watch-tokyo-store-audit.md): current issues, priority plan, category proposal, product page structure, trust navigation, and WDB alignment notes.
* [`docs/watch-tokyo-homepage-proposal.md`](docs/watch-tokyo-homepage-proposal.md): manual homepage section proposal for hero, trust points, featured JDM watches, shop-by-brand, shop-by-category, shipping, customs, FAQ, and contact.
* [`docs/customer-friendly-copy-templates.md`](docs/customer-friendly-copy-templates.md): reusable English copy for homepage, shipping, authenticity, customs, about text, product pages, and FAQ.

Operational guardrails remain unchanged: WDB-created products stay as WooCommerce drafts, a human must review before publishing, top-page or fixed-page update automation is not implemented in this phase, and initial real operation should remain a small 5 to 10 row review.

---

## YouTube video embed workflow

WooCommerce products can be safely matched with the watch-tokyo.com YouTube channel by running a Dry Run first. The workflow is documented in [`docs/youtube-video-embed-workflow.md`](docs/youtube-video-embed-workflow.md).

Use `dryRunMatchYouTubeVideosToWooProducts()` for YouTube Data API matching, or `dryRunMatchManualYouTubeVideosToWooProducts()` when using the manual `YouTube_Videos_Manual` sheet. Production embedding is limited to reviewed `READY_TO_EMBED` rows through `embedMatchedYouTubeVideosToWooProducts()`, appends the video section to the existing description, avoids duplicate video IDs, does not publish products, and processes at most 10 products per run.

## WooCommerce Access Ranking Top5

`buildWooAccessRankingTop5()` builds a WooCommerce-only lightweight dashboard for the five products that should be checked each morning. It writes to `WC_Access_Ranking_Top5` and does not publish, bulk-update, or change product data.

Added functions:

- `buildWooAccessRankingTop5()`
- `runWooAccessRankingDaily()`
- `runWooAccessRankingDailyWithSlack()`
- `testBuildWooAccessRankingTop5()`

Manual test order:

1. `testBuildWooAccessRankingTop5()`
2. `buildWooAccessRankingTop5()`
3. `runWooAccessRankingDaily()`
4. `runWooAccessRankingDailyWithSlack()`

When `GA4_PROPERTY_ID` is not set in Script Properties, the ranking continues with WooCommerce product and order data only. If a compatible Slack sender already exists, `runWooAccessRankingDailyWithSlack()` reuses it; otherwise Slack notification is safely skipped.

