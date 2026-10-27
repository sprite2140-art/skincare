# SH 洗护补缺自查报告
核对日期：2026-10-27（美国东部时间）。这是本次新增文件；原107款清单、已验收护肤批次均不重发。

## 1. 数量与编号
新增20款，SH-US-061–SH-US-080，连续且无重复。按品牌与英文名称对照全部107款（97款美国版），标准化精确重复为0；同品牌系列名逐项复核：Joico Color Balance与原K-PAK Color Therapy不同，SEEN Deeper与原普通Conditioner不同，Bumble三个洗发系列各自独立。原库未改写。
同品牌本批上限通过（最多4款）；合并原库没有新增超限。原库洗发水Biolage、L’Oréal Paris已经超过4款，本批未给这两个品牌新增洗发水。

## 2. 表头
products.csv为50列，与已验收模板逐字、逐列比较一致；末10列全部留空。配套purchase_links为6列、retail_ratings为9列。UTF-8 BOM、英文逗号、CSV转义和每行列数均通过；全部为US、rinse_off。

## 3. 成分表
每款仅取一个完整列表。分号只替换顶层分隔符，括号内逗号及数字名称内逗号保留。OTC活性成分置于同页完整非活性成分之前；浓度写在key_actives，不写入洗护专用留空的末10列。植物来源星号仅作为脚注标记去除，未合并不同版本。
| 编号 | 成分项数 | 单一来源 |
|---|---:|---|
| SH-US-061 | 21 | [来源](https://www.dove.com/us/en/p/derma--scalp-dandruff-itch-relief-shampoo.html/00079400528070) |
| SH-US-062 | 21 | [来源](https://happycappyshampoo.com/product/daily-eczema-shampoo-body-wash/) |
| SH-US-063 | 38 | [来源](https://www.garnierusa.com/about-our-brands/fructis/sleek-and-shine/sleek-shine-shampoo) |
| SH-US-064 | 23 | [来源](https://www.bumbleandbumble.com/product/19047/219/care/shampoos/sunday-shampoo-a-weekly-clarifying-shampoo) |
| SH-US-065 | 14 | [来源](https://www.aveeno.com/products/kids/2-in-1) |
| SH-US-066 | 24 | [来源](https://herbalessences.com/en-us/our-products/color-me-happy-shampoo-for-colored-hair/) |
| SH-US-067 | 8 | [来源](https://www.paulmitchell.com/products/clear-essential-shampoo) |
| SH-US-068 | 38 | [来源](https://www.ulta.com/p/color-balance-blue-shampoo-pimprod2021420?sku=2569594) |
| SH-US-069 | 40 | [来源](https://www.ulta.com/p/color-balance-purple-shampoo-pimprod2021533?sku=2569595) |
| SH-US-070 | 16 | [来源](https://happycappyshampoo.com/product/shampoo-for-cradle-cap-and-seborrheic-dermatitis/) |
| SH-US-071 | 12 | [来源](https://www.neutrogena.com/products/haircare/tsal-therapeutic-shampoo-scalp-build-up-control/6809650) |
| SH-US-072 | 12 | [来源](https://www.clnwash.com/products/shampoo) |
| SH-US-073 | 30 | [来源](https://www.briogeohair.com/products/destined-for-density-megastrength-caffeine-biotin-peptide-density-shampoo) |
| SH-US-074 | 8 | [来源](https://www.mustelausa.com/products/stelatopia-foam-shampoo) |
| SH-US-075 | 17 | [来源](https://odelebeauty.com/products/volumizing-shampoo) |
| SH-US-076 | 46 | [来源](https://www.bumbleandbumble.com/product/19047/31245/care/shampoos/hairdressers-invisible-oil-hydrating-shampoo) |
| SH-US-077 | 89 | [来源](https://www.oribe.com/products/gold-lust-repair-restore-shampoo) |
| SH-US-078 | 32 | [来源](https://www.bumbleandbumble.com/product/19047/199/care/shampoos/gentle-shampoo-for-every-day-hair-moisture) |
| SH-US-079 | 26 | [来源](https://www.briogeohair.com/products/scalp-revival-dandruff-relief-shampoo) |
| SH-US-080 | 25 | [来源](https://dphue.com/products/cool-brunette-shampoo) |

Joico Color Balance与HydraSplash共5款的完整成分来自同名美国Ulta商品页；官网产品页提供定位原文但未取得官网全成分，报告不声称已做品牌与零售商全表逐项比对。其他产品优先官网全表。Aveeno Kids全表已打开品牌页“Full List of Ingredients”弹层核对。
发现零售商旧表或不同表时保留官网当前全表并标retail_mismatch；不拼接，不把零售商旧配方当作第二个产品。差异可能包括INCI排序、命名和配方更新，状态不等于已查明每项差异原因。

## 4. 品牌宣称
以下均有美国品牌产品页短摘录，brand_claims与brand_claims_quote一致；多个原文片段用“ | ”隔开。功效仅使用支持的枚举；不把含某成分等同于成品功效。
| 编号 | 状态 | 主要功效 |
|---|---|---|
| SH-US-061 | brand_page_quote | dry_scalp;scalp_itch;dandruff |
| SH-US-062 | brand_page_quote | dry_scalp;sensitive_scalp;scalp_itch |
| SH-US-063 | brand_page_quote | frizz;shine |
| SH-US-064 | brand_page_quote | clarifying;scalp_oil |
| SH-US-065 | brand_page_quote | sensitive_scalp;tangling |
| SH-US-066 | brand_page_quote | color_fade;damage |
| SH-US-067 | brand_page_quote | sensitive_scalp |
| SH-US-068 | brand_page_quote | tone_orange;shine |
| SH-US-069 | brand_page_quote | tone_yellow |
| SH-US-070 | brand_page_quote | dandruff;scalp_itch;scalp_redness |
| SH-US-071 | brand_page_quote | dandruff;scalp_itch;clarifying |
| SH-US-072 | brand_page_quote | dandruff;scalp_itch;scalp_oil |
| SH-US-073 | brand_page_quote | hair_loss;flat_hair |
| SH-US-074 | brand_page_quote | dry_scalp;sensitive_scalp |
| SH-US-075 | retail_mismatch | flat_hair |
| SH-US-076 | retail_mismatch | frizz;tangling |
| SH-US-077 | retail_mismatch | damage |
| SH-US-078 | retail_mismatch | shine |
| SH-US-079 | brand_page_quote | dandruff;scalp_itch |
| SH-US-080 | retail_mismatch | tone_orange |

Paul Mitchell Clear Conditioner、Ethique Gentle主要明确柔软/滋润，未强行归为frizz或新增不在模板内的hair dryness。无香yes仅认品牌明确fragrance-free；Odele“no synthetic fragrance”常规款未当成无香。tested_claims未填没有公开年份/方法的推断测试结论。

## 5. 价格与规格
每款只有一个参考单瓶/单块SKU，使用一次性常规美元价格。四款Bumble百货大瓶逐一选择33.8 Ounce后核对售价与可配送状态；品牌同时明确1 Liter，因此size_ml=1000。Oribe两款选择标准瓶而非补充袋；页面只披露Ounce的参考规格不硬换算mL。
Mustela以美国品牌单瓶$19作价格参考，Amazon仅作直接入库评价依据，未为看价加入购物车。其余原文只有oz而无明确液体单位者，size_ml留空；有明确mL或fl oz者按模板记录/换算。Ethique按60g净重，mL留空。
| 编号 | USD | 参考原规格与说明 |
|---|---:|---|
| SH-US-061 | 9.97 | Reference SKU see PDP; 16 fl oz |
| SH-US-062 | 12.98 | Reference SKU see PDP; 8 fl oz |
| SH-US-063 | 6.49 | Reference SKU see PDP; 22 fl oz |
| SH-US-064 | 36.00 | Reference SKU 2515554; 8.5 oz |
| SH-US-065 | 8.88 | Reference SKU see PDP; 12 fl oz |
| SH-US-066 | 8.97 | Reference SKU see PDP; 29.2 fl oz |
| SH-US-067 | 20.00 | Reference SKU 2637355; 10.14 fl. oz. |
| SH-US-068 | 24.50 | Reference SKU 2569594; 10.1 oz |
| SH-US-069 | 24.50 | Reference SKU 2569595; 10.1 oz |
| SH-US-070 | 12.84 | Reference SKU see PDP; 8 fl oz |
| SH-US-071 | 7.79 | Reference SKU see PDP; 4.5 fl oz |
| SH-US-072 | 36.00 | Reference SKU see PDP; 8 fl. oz. |
| SH-US-073 | 32.00 | Reference SKU 2610679; 8.0 oz |
| SH-US-074 | 19.00 | Reference SKU see PDP; 5.07 fl oz |
| SH-US-075 | 11.99 | Reference SKU 2605201; 13 fl oz |
| SH-US-076 | 105.00 | Reference SKU 2542050; 33.8 Ounce / brand 1 Liter |
| SH-US-077 | 56.00 | Reference SKU 2635424; 8.5 Ounce; bottle, not refill |
| SH-US-078 | 102.00 | Reference SKU 2516153; 33.8 Ounce / brand 1 Liter |
| SH-US-079 | 42.00 | Reference SKU 2648976; 8.4 oz |
| SH-US-080 | 28.00 | Reference SKU 2544559; 8.5 oz |

## 6. 覆盖表
“新”仅为本次20款；“合计”=原美国清单该品类+本次新增。旧库标签与价格按附件原值统计，不借此重写旧库，也不把旧款冒充本次新增。
| 困扰 | 新≤$15 | 新≤$30 | 新≤$60 | 新不限 | 新无香 | 合计不限 | 合计无香（附件原值） |
|---|---:|---:|---:|---:|---:|---:|---:|
| dandruff | 3 | 3 | 5 | 5 | 2 | 13 | 2 |
| scalp_oil | 0 | 0 | 2 | 2 | 1 | 7 | 1 |
| scalp_itch | 4 | 4 | 6 | 6 | 3 | 10 | 3 |
| scalp_redness | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| hair_loss | 0 | 0 | 1 | 1 | 0 | 6 | 0 |
| dry_scalp | 2 | 3 | 3 | 3 | 2 | 6 | 3 |
| sensitive_scalp | 2 | 4 | 4 | 4 | 3 | 9 | 5 |
| clarifying | 1 | 1 | 2 | 2 | 0 | 12 | 2 |
| frizz | 1 | 1 | 1 | 2 | 0 | 4 | 1 |
| tangling | 1 | 1 | 1 | 2 | 0 | 2 | 0 |
| flat_hair | 1 | 1 | 2 | 2 | 0 | 6 | 0 |
| color_fade | 1 | 1 | 1 | 1 | 0 | 9 | 1 |
| shine | 1 | 2 | 2 | 3 | 0 | 5 | 0 |
| tone_yellow | 0 | 1 | 1 | 1 | 0 | 3 | 0 |
| tone_orange | 0 | 2 | 2 | 2 | 0 | 3 | 0 |

### 按计划逐项核对
累计补缺与“新增数量”分别披露，不将累计达到写成新增达到。
| 要求 | 本次 / 累计 | 结论 |
|---|---|---|
| ≤$11 dry_scalp | 1 / 2 | 累计达到2 |
| ≤$11 sensitive_scalp | 1 / 2 | 累计达到2 |
| ≤$11 frizz或tangling（按不同产品去重） | 2 / 3 | 累计达到2；不是各标签单独2 |
| ≤$11 flat_hair | 0 / 2 | 原库已有2；本次没有新增低价款 |
| ≤$11 clarifying | 1 / 3 | 累计达到2 |
| ≤$11 color_fade | 1 / 2 | 累计达到2 |
| ≤$20 dry_scalp共4（低价2+再补2） | 3 / 4 | 累计达到4 |
| shine共3且至少1款≤$11 | 新3 / 合计5；低价2 | 达到 |
| tone_yellow共3且至少1款≤$11 | 新1 / 合计3；低价1 | 累计达到；若要求新增3，仍缺2 |
| 蓝色tone_orange共3且至少1款≤$11 | 新2 / 合计3；低价0 | **未达到低价要求，缺1**；若要求新增3，仍缺1 |
| 无香dandruff至少3 | 新2 / 附件原值合计2 | **CSV汇总仍缺1**；另有CeraVe旧款品牌补证见下 |
| 无香scalp_itch至少3 | 新3 / 合计3 | 达到 |
| 无香sensitive_scalp至少3 | 新3 / 合计5 | 达到 |
| 无香dry_scalp至少3 | 新2 / 合计3 | 累计达到 |
| 含咖啡因/酮康唑的洗发水3款 | 新Briogeo SH-US-073；原Nizoral SH-US-042、048 | 成分覆盖累计3；不据此给Nizoral新增hair_loss宣称 |
| >$50，百货渠道至少3 | SH-US-076 $105；077 $56；078 $102 | 新增3，达到 |

CeraVe SH-US-001附件无香原值为unknown。现行[美国品牌页](https://www.cerave.com/haircare/shampoo/anti-dandruff-hydrating-shampoo)明确“free of ... fragrance”，可支持该旧款无香补证；本包只交新增记录，没有改写旧款。若网站采纳补证，累计无香dandruff可从2变3；在旧库字段更新前，不把机器汇总写成3。
Nizoral薄荷/茶树版的[美国FDA标签](https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/020310Orig1s033lbl.pdf)明确Ketoconazole 1%；另一旧款名称本身已标1% Ketoconazole。它们仅计入指定成分覆盖，不声称品牌有防脱疗效。

### 入库依据范围
使用直接商品页>=1,000评价，或实际零售商Best Sellers排序的主商品卡。无推荐轮播、品牌自称bestselling、第三方转述评价。少评商品使用的细分列表均明确写在CSV依据里：Ulta Color Protection分类Best Sellers第2页，或Fragrance Free分类Best Sellers第1页；不是全站排名。未使用品牌筛选后单品牌列表冒充总榜。

## 7. 待核对清单
无带[待核对]的成分名。
品牌/零售商成分差异已逐款标retail_mismatch，主要涉及Odele、SEEN、部分Bumble、Oribe、dpHUE和Living Proof。它们采用单一品牌表；购买时应按实际到货标签确认配方，CSV没有把两个列表合并。仅oz无液体单位的规格缺mL，属于保留空值而非已完成体积核验。

## 8. 未完成的部分
- 尚未找到同时满足美国在售、直接零售商入库依据、≤$11的蓝色去橙参考单瓶；本品类低价蓝色覆盖未完成。
- 若总计划“各补3”严格指本次各新增3款：紫色洗护只新增1款、蓝色洗护只新增2款，分别仍缺2与1。累计达到不视为此新增配额的豁免。
- 若低价flat_hair要求2个新增护发素，本次仅新增1个，仍缺1（仅CO适用）。
- 原库CeraVe去屑款无香补证只写入本报告，原库unknown字段未改写；按附件原字段统计的无香去屑数仍不足3（仅SH适用）。
- CO-US-040的一处官网成分拼写待核对；所有retail_mismatch保留为明确版本差异，不声称已排除库存中旧配方。

最终文件结构、编号、去重、引用字段、反向配对和单一成分来源检查通过；这不等于全部选品覆盖配额已完成。
