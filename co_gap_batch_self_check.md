# CO 洗护补缺自查报告
核对日期：2026-10-27（美国东部时间）。这是本次新增文件；原107款清单、已验收护肤批次均不重发。

## 1. 数量与编号
新增20款，CO-US-038–CO-US-057，连续且无重复。按品牌与英文名称对照全部107款（97款美国版），标准化精确重复为0；同品牌系列名逐项复核：Joico Color Balance与原K-PAK Color Therapy不同，SEEN Deeper与原普通Conditioner不同，Bumble三个洗发系列各自独立。原库未改写。
同品牌本批上限通过（最多4款）；合并原库没有新增超限。原库洗发水Biolage、L’Oréal Paris已经超过4款，本批未给这两个品牌新增洗发水。

## 2. 表头
products.csv为50列，与已验收模板逐字、逐列比较一致；末10列全部留空。配套purchase_links为6列、retail_ratings为9列。UTF-8 BOM、英文逗号、CSV转义和每行列数均通过；全部为US、rinse_off。

## 3. 成分表
每款仅取一个完整列表。分号只替换顶层分隔符，括号内逗号及数字名称内逗号保留。OTC活性成分置于同页完整非活性成分之前；浓度写在key_actives，不写入洗护专用留空的末10列。植物来源星号仅作为脚注标记去除，未合并不同版本。
| 编号 | 成分项数 | 单一来源 |
|---|---:|---|
| CO-US-038 | 32 | [来源](https://www.garnierusa.com/about-our-brands/fructis/sleek-and-shine/sleek-shine-conditioner) |
| CO-US-039 | 17 | [来源](https://herbalessences.com/en-us/our-products/color-me-happy-conditioner-for-colored-hair/) |
| CO-US-040 | 23 | [来源](https://www.livingproof.com/products/full-conditioner) |
| CO-US-041 | 16 | [来源](https://www.ogxbeauty.com/products/biotin-collagen-conditioner) |
| CO-US-042 | 17 | [来源](https://odelebeauty.com/products/volumizing-conditioner) |
| CO-US-043 | 45 | [来源](https://www.kristinesshair.com/products/the-one-signature-conditioner) |
| CO-US-044 | 37 | [来源](https://loveamika.com/products/mirrorball-high-shine-antioxidant-conditioner) |
| CO-US-045 | 23 | [来源](https://dphue.com/products/cool-brunette-conditioner) |
| CO-US-046 | 45 | [来源](https://www.ulta.com/p/hydrasplash-hydrating-conditioner-pimprod2014359?sku=2558771) |
| CO-US-047 | 34 | [来源](https://www.ulta.com/p/color-balance-blue-conditioner-pimprod2021529?sku=2569597) |
| CO-US-048 | 34 | [来源](https://www.ulta.com/p/color-balance-purple-conditioner-pimprod2021531?sku=2569600) |
| CO-US-049 | 32 | [来源](https://www.pureology.com/hair-care/strength-cure-conditioner-repairing-damaged-hair.html) |
| CO-US-050 | 9 | [来源](https://www.paulmitchell.com/products/clear-essential-conditioner) |
| CO-US-051 | 15 | [来源](https://ethique.com/products/gentle-conditioner-bar-fragrance-free) |
| CO-US-052 | 19 | [来源](https://helloseen.com/products/seen-deeper-conditioner-fragrance-free) |
| CO-US-053 | 19 | [来源](https://odelebeauty.com/products/ultra-sensitive-conditioner) |
| CO-US-054 | 34 | [来源](https://www.verbproducts.com/products/hydrate-conditioner) |
| CO-US-055 | 36 | [来源](https://www.bumbleandbumble.com/product/19048/31246/care/conditioners/hairdressers-invisible-oil-hydrating-conditioner) |
| CO-US-056 | 84 | [来源](https://www.oribe.com/products/gold-lust-repair-restore-conditioner) |
| CO-US-057 | 25 | [来源](https://www.bumbleandbumble.com/product/19048/220/care/conditioners/super-rich-conditioner-for-every-day-hair-moisture) |

Joico Color Balance与HydraSplash共5款的完整成分来自同名美国Ulta商品页；官网产品页提供定位原文但未取得官网全成分，报告不声称已做品牌与零售商全表逐项比对。其他产品优先官网全表。Aveeno Kids全表已打开品牌页“Full List of Ingredients”弹层核对。
发现零售商旧表或不同表时保留官网当前全表并标retail_mismatch；不拼接，不把零售商旧配方当作第二个产品。差异可能包括INCI排序、命名和配方更新，状态不等于已查明每项差异原因。

## 4. 品牌宣称
以下均有美国品牌产品页短摘录，brand_claims与brand_claims_quote一致；多个原文片段用“ | ”隔开。功效仅使用支持的枚举；不把含某成分等同于成品功效。
| 编号 | 状态 | 主要功效 |
|---|---|---|
| CO-US-038 | brand_page_quote | frizz;shine |
| CO-US-039 | brand_page_quote | color_fade;shine |
| CO-US-040 | retail_mismatch | flat_hair |
| CO-US-041 | brand_page_quote | flat_hair |
| CO-US-042 | retail_mismatch | flat_hair;shine |
| CO-US-043 | brand_page_quote | shine |
| CO-US-044 | brand_page_quote | shine |
| CO-US-045 | retail_mismatch | tone_orange;tangling;shine |
| CO-US-046 | brand_page_quote | tangling;shine |
| CO-US-047 | brand_page_quote | tone_orange;tangling |
| CO-US-048 | brand_page_quote | tone_yellow;tangling |
| CO-US-049 | brand_page_quote | damage |
| CO-US-050 | brand_page_quote | 留空：仅明确滋润/柔软，无对应头发枚举 |
| CO-US-051 | brand_page_quote | 留空：仅明确滋润/柔软，无对应头发枚举 |
| CO-US-052 | retail_mismatch | frizz;damage |
| CO-US-053 | retail_mismatch | frizz;shine;damage |
| CO-US-054 | retail_mismatch | frizz;shine |
| CO-US-055 | retail_mismatch | frizz;tangling |
| CO-US-056 | retail_mismatch | damage |
| CO-US-057 | retail_mismatch | tangling;shine |

Paul Mitchell Clear Conditioner、Ethique Gentle主要明确柔软/滋润，未强行归为frizz或新增不在模板内的hair dryness。无香yes仅认品牌明确fragrance-free；Odele“no synthetic fragrance”常规款未当成无香。tested_claims未填没有公开年份/方法的推断测试结论。

## 5. 价格与规格
每款只有一个参考单瓶/单块SKU，使用一次性常规美元价格。四款Bumble百货大瓶逐一选择33.8 Ounce后核对售价与可配送状态；品牌同时明确1 Liter，因此size_ml=1000。Oribe两款选择标准瓶而非补充袋；页面只披露Ounce的参考规格不硬换算mL。
Mustela以美国品牌单瓶$19作价格参考，Amazon仅作直接入库评价依据，未为看价加入购物车。其余原文只有oz而无明确液体单位者，size_ml留空；有明确mL或fl oz者按模板记录/换算。Ethique按60g净重，mL留空。
| 编号 | USD | 参考原规格与说明 |
|---|---:|---|
| CO-US-038 | 6.49 | Reference SKU see PDP; 21 fl oz |
| CO-US-039 | 8.97 | Reference SKU see PDP; 29.2 fl oz |
| CO-US-040 | 36.00 | Reference SKU 2635427; 8.0 oz |
| CO-US-041 | 6.97 | Reference SKU see PDP; 13 fl oz |
| CO-US-042 | 11.99 | Reference SKU 2605202; 13 fl oz |
| CO-US-043 | 12.00 | Reference SKU 2579339; 10 fl oz / brand 296 mL |
| CO-US-044 | 28.00 | Reference SKU 2647621; 9.2 oz / brand 275 mL |
| CO-US-045 | 28.00 | Reference SKU 2544603; 6.5 oz |
| CO-US-046 | 24.50 | Reference SKU 2558771; 8.5 oz |
| CO-US-047 | 24.50 | Reference SKU 2569597; 8.5 oz |
| CO-US-048 | 24.50 | Reference SKU 2569600; 8.5 oz |
| CO-US-049 | 39.00 | Reference SKU 2565133; 9 fl oz / brand 266 mL |
| CO-US-050 | 20.00 | Reference SKU 2637354; 10.14 fl. oz. |
| CO-US-051 | 14.00 | Reference SKU see PDP; Net weight 60 g / 2.1 oz |
| CO-US-052 | 32.00 | Reference SKU 2584261; 8.5 fl oz |
| CO-US-053 | 11.99 | Reference SKU 2617796; 13.0 oz |
| CO-US-054 | 22.00 | Reference SKU 2624698; 12 fl oz |
| CO-US-055 | 113.00 | Reference SKU 2516139; 33.8 Ounce / brand 1 Liter |
| CO-US-056 | 59.00 | Reference SKU 2635427; 6.8 Ounce; bottle, not refill |
| CO-US-057 | 108.00 | Reference SKU 2516170; 33.8 Ounce / brand 1 Liter |

## 6. 覆盖表
“新”仅为本次20款；“合计”=原美国清单该品类+本次新增。旧库标签与价格按附件原值统计，不借此重写旧库，也不把旧款冒充本次新增。
| 困扰 | 新≤$15 | 新≤$30 | 新≤$60 | 新不限 | 新无香 | 合计不限 | 合计无香（附件原值） |
|---|---:|---:|---:|---:|---:|---:|---:|
| damage | 1 | 1 | 4 | 4 | 2 | 15 | 3 |
| frizz | 2 | 3 | 4 | 5 | 2 | 21 | 3 |
| flat_hair | 2 | 2 | 3 | 3 | 0 | 8 | 1 |
| tangling | 0 | 4 | 4 | 6 | 0 | 23 | 3 |
| color_fade | 1 | 1 | 1 | 1 | 0 | 6 | 0 |
| shine | 5 | 9 | 9 | 10 | 1 | 13 | 1 |
| curl_definition | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| tone_yellow | 0 | 1 | 1 | 1 | 0 | 3 | 0 |
| tone_orange | 0 | 2 | 2 | 2 | 0 | 4 | 0 |

### 按计划逐项核对
累计补缺与“新增数量”分别披露，不将累计达到写成新增达到。
| 要求 | 本次 / 累计 | 结论 |
|---|---|---|
| shine共3且至少1款≤$11 | 新10 / 合计13；低价3 | 达到 |
| tone_yellow共3且至少1款≤$11 | 新1 / 合计3；低价1 | 累计达到；若要求新增3，仍缺2 |
| 蓝色tone_orange共3且至少1款≤$11 | 新2 / 实际蓝色合计3；低价0 | **未达到低价要求，缺1**；若要求新增3，仍缺1 |
| ≤$11 flat_hair补2 | 新1 / 合计2 | 累计达到2；**若按新增2，仍缺1** |
| ≤$11 color_fade补1 | 新1 / 合计3 | 新增达到 |
| 无香滋润或减少毛躁补3 | Ethique CO-US-051、SEEN 052、Odele 053；另有Paul Mitchell 050 | 明确滋润/frizz新增3，达到 |
| >$50，百货渠道至少3 | CO-US-055 $113；056 $59；057 $108 | 新增3，达到 |

附件CO-US-008虽带tone_orange标签，但产品名为Purple Conditioner，不能冒充计划要求的“蓝色洗护”。上表实际蓝色只计原Matrix CO-US-011与本次dpHUE CO-US-045、Joico CO-US-047。因此旧库橙色标签下的$10.99紫色款不用于满足低价蓝色要求。

### 入库依据范围
使用直接商品页>=1,000评价，或实际零售商Best Sellers排序的主商品卡。无推荐轮播、品牌自称bestselling、第三方转述评价。少评商品使用的细分列表均明确写在CSV依据里：Ulta Color Protection分类Best Sellers第2页，或Fragrance Free分类Best Sellers第1页；不是全站排名。未使用品牌筛选后单品牌列表冒充总榜。

## 7. 待核对清单
- CO-US-040：官网写“Ethyl Lauroyl Arginate HCI”（末字母显示为I），已原样保留并标[待核对]，未擅改HCl。
品牌/零售商成分差异已逐款标retail_mismatch，主要涉及Odele、SEEN、部分Bumble、Oribe、dpHUE和Living Proof。它们采用单一品牌表；购买时应按实际到货标签确认配方，CSV没有把两个列表合并。仅oz无液体单位的规格缺mL，属于保留空值而非已完成体积核验。

## 8. 未完成的部分
- 尚未找到同时满足美国在售、直接零售商入库依据、≤$11的蓝色去橙参考单瓶；本品类低价蓝色覆盖未完成。
- 若总计划“各补3”严格指本次各新增3款：紫色洗护只新增1款、蓝色洗护只新增2款，分别仍缺2与1。累计达到不视为此新增配额的豁免。
- 若低价flat_hair要求2个新增护发素，本次仅新增1个，仍缺1（仅CO适用）。
- 原库CeraVe去屑款无香补证只写入本报告，原库unknown字段未改写；按附件原字段统计的无香去屑数仍不足3（仅SH适用）。
- CO-US-040的一处官网成分拼写待核对；所有retail_mismatch保留为明确版本差异，不声称已排除库存中旧配方。

最终文件结构、编号、去重、引用字段、反向配对和单一成分来源检查通过；这不等于全部选品覆盖配额已完成。
