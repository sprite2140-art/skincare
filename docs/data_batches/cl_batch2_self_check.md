# 洁面首批修正与第二批自查报告

核对日期：2026-10-19。第二批为 CL-US-021–040，共 20 款。products.csv 固定 50 列。

## 首批修正版：仅 4 行

修正版只修改 claimed_benefits，其余 49 列逐值保留；按 product_id 覆盖导入。

| 产品 | 原定位 | 修正后 | 原文依据与理由 |
|---|---|---|---|
| CL-US-011 | oil;pores;redness | oil;pores | Deeply decongests pores & reduces excess oil；保留控油、毛孔两项主要定位，去掉次要舒缓项。 [品牌页](https://tatcha.com/products/the-matcha-foam-cleanse) |
| CL-US-012 | dryness;redness;acne;oil;pores;pigmentation | dryness;redness | Skin is visibly calm, hydrated, and healthy-looking.；仅保留补水与舒缓，不把痘痘、油、毛孔、色素当作主要定位。 [品牌页](https://www.peachandlily.com/products/power-calm-hydrating-gel-cleanser) |
| CL-US-014 | dryness;redness;pigmentation | dryness;redness | Hydrating Facial Cleansing Gel；soothes and balances all skin types.；保留补水与舒缓，移除主要由玫瑰水说明延伸的提亮。 [品牌页](https://v1.goodmolecules.com/products/hydrating-facial-cleansing-gel?Option=Single&Size=200ml) |
| CL-US-015 | acne;oil;pores | acne;oil | Acne face wash removes excess oil and impurities；Helps clear acne breakouts；保留祛痘、去除多余油脂，毛孔属次要。 [品牌页](https://www.laroche-posay.us/our-products/face/acne-products/effaclar-medicated-acne-face-wash-effaclaracnewash.html) |

首批 20 行均已复核主要定位数量。CL-US-006 保留 acne;pores;oil（品牌成品定位明确）；CL-US-008 保留 oil;pores;redness（品牌推荐困扰明确列出 oiliness、pores，并有成品舒缓宣称）。CL-US-018 的补水与舒缓均有品牌成品依据。

CL-US-019、020 的 pigmentation 保留：前者明确宣称淡斑，后者明确宣称产品令肤色更明亮均匀；没有新增任何 aging 标签。

## 第二批覆盖

| 要求 | 已收集 | 产品编号 |
|---|---:|---|
| 无香 + acne ≥2 | 2 | CL-US-021, CL-US-022 |
| 无香 + oil ≥2 | 3 | CL-US-025, CL-US-026, CL-US-034 |
| 无香 + pores ≥2 | 2 | CL-US-021, CL-US-022 |
| 无香 + redness ≥2 | 3 | CL-US-027, CL-US-028, CL-US-030 |
| $50–100 ≥4 | 4 | CL-US-035, CL-US-036, CL-US-037, CL-US-038 |
| >$100 ≥2 | 2 | CL-US-039, CL-US-040 |
| acne ≥3 | 5 | CL-US-021, CL-US-022, CL-US-023, CL-US-024, CL-US-035 |
| 过氧化苯甲酰 4–5% ≥1 | 3 | CL-US-021、023、024，均为 4% |
| 水杨酸 ≥1 | 1 | CL-US-022，品牌公开 1.5% |
| 祛痘且 ≤$15 ≥1 | 1 | CL-US-021，Ulta 单瓶 $13.49，6.0 oz |

高价段为 Tata Harper 两款、Clé de Peau、CHANEL 各一款，以及 La Mer 两款。均在 Nordstrom 的 Best-Selling Face Washes & Cleansers 专题收录；不把商品页的品牌自称 bestseller 当作入库依据，也不虚构销量名次。当前榜单年份记为 2026，awards 留空，不把榜单写成美容奖。

## 八项自查

| 检查 | 结果 | 发现与处理 |
|---|---|---|
| 1. 成分数量、顺序与拆分 | 20 款均取得单一来源完整表 | 保留数字内部逗号、括号内部逗号；1,2-Hexanediol 未拆开。药用活性/非活性分区按原披露顺序记录，不能当作合并降序配方。下表逐款给出数量。 |
| 2. 浓度、pH、SPF | 仅录品牌明确公开数据 | 4% BPO 三款、1.5% SA 一款、3% Niacinamide 一款；high 共 5 款。其余 medium。没有推测 pH，没有给洁面填写 SPF。自然来源比例、使用效果百分比不当成活性浓度。 |
| 3. 品牌宣称出处 | 20/20 有品牌产品页原文短摘录 | brand_claims 与 brand_claims_quote 相同；主要定位最多 2 项。CL-US-036 的提亮有成品原文依据；CL-US-039 没有合适的困扰标签，留空。品牌原文仅短摘录，不把成分机制或评价写成品牌效果。 |
| 4. 无香宣称 | 10 款 yes，其余 unknown | 9 款为明确 fragrance-free/fragrance free 表述；CL-US-021 的等义明确披露为 Ulta “Formulated Without: Fragrances”，单独注明，不由 INCI 推断。敏感肌适用、无味、无添加合成香精均未自动视作无香。 |
| 5. 价格与规格 | 已按每行参考 SKU 核对 | Ulta 采用一次性单瓶价格，不用订阅价、捆绑折扣。Tata Harper 采用 125ml 规格的 $68/$88，未误取 $28 小样价。La Mer 选完整单品正装，非套装。明确重量或无法确认液量的 oz 不换算为 ml。 |
| 6. 去重 | 通过 | 新增 20 个 ID 连续唯一，并与首批 20 款按品牌/产品名称及配方系列复核；不同容量不重复入库。 |
| 7. 链接打开 | 部分零售商页面受限，已标注 | 品牌来源通过网页正文读取或直接读取；14 个 Ulta 产品页直接读取。Nordstrom 6 个产品页直接返回访问验证，产品上架与榜单收录由零售商搜索索引正文交叉核对；purchase_links.note 标 [待核对]，未记录其评分。没有反复尝试评分，不专门核验 Amazon。 |
| 8. 列名、列数、CSV 格式 | 通过 | 两份 products.csv 都与原模板逐字符比较表头，50 列、顺序不变；英文逗号分隔、标准 CSV 引号、字段内多值英文分号。 |

## 成分来源逐款计数

| ID | 产品 | 成分数量 | 来源 |
|---|---|---:|---|
| CL-US-021 | Acne Creamy Wash 4% Benzoyl Peroxide | 22 | [成分表](https://panoxyl.com/acne-products/acne-creamy-wash/) |
| CL-US-022 | Acne Solutions Cleansing Foam | 27 | [成分表](https://www.clinique.com/products/acne-solutions-cleansing-foam) |
| CL-US-023 | Acne Foaming Cream Cleanser | 28 | [成分表](https://www.cerave.com/skincare/cleansers/acne-benzoyl-peroxide-cleanser) |
| CL-US-024 | Effaclar Dual Action Acne Face Wash With 4% Benzoyl Peroxide | 23 | [成分表](https://www.laroche-posay.us/our-products/face/acne-products/effaclar-dual-action-acne-face-wash-3606000639645.html) |
| CL-US-025 | Niacinamide Cleansing Gelée 3% | 15 | [成分表](https://naturium.com/products/niacinamide-cleansing-gelee-3) |
| CL-US-026 | All About Clean Liquid Facial Soap Oily Skin Formula | 20 | [成分表](https://www.clinique.com/products/all-about-clean-liquid-facial-soap-oily-skin-formula-for-combination-oily-to-oily-skin) |
| CL-US-027 | Ultra Gentle Pure Skin Face Cleanser | 27 | [成分表](https://www.firstaidbeauty.com/products/ultra-gentle-pure-skin-face-cleanser) |
| CL-US-028 | Redness Relief Soothing Cleanser | 33 | [成分表](https://www.peachandlily.com/products/redness-relief-soothing-cleanser) |
| CL-US-029 | Creamy Jelly Cleanser | 28 | [成分表](https://www.ulta.com/p/creamy-jelly-cleanser-pimprod2034789?sku=2601331) |
| CL-US-030 | Milky Moisture Cleanser | 44 | [成分表](https://www.ulta.com/p/milky-moisture-cleanser-pimprod2043229?sku=2620413) |
| CL-US-031 | Hydrobubble Deep Foam Cleanser | 35 | [成分表](https://www.peachandlily.com/products/hydrobubble-deep-foam-cleanser) |
| CL-US-032 | Gentle Skin Cleanser | 10 | [成分表](https://www.cetaphil.com/us/products/product-categories/all-cleansers/cetaphil-gentle-skin-cleanser/302990110227.html) |
| CL-US-033 | Fresh Start Gel Cleanser | 14 | [成分表](https://www.ulta.com/p/fresh-start-gel-cleanser-pimprod2035467?sku=2600875) |
| CL-US-034 | All About Clean Rinse-Off Foaming Cleanser | 18 | [成分表](https://www.clinique.com/products/all-about-clean-rinse-off-foaming-cleanser) |
| CL-US-035 | Clarifying Cleanser | 53 | [成分表](https://tataharperskincare.com/products/clarifying-cleanser) |
| CL-US-036 | Regenerating Cleanser | 35 | [成分表](https://tataharperskincare.com/products/regenerating-cleanser) |
| CL-US-037 | Softening Cleansing Foam | 42 | [成分表](https://www.cledepeaubeaute.com/softening-cleansing-foam/9990000000311.html) |
| CL-US-038 | LA MOUSSE Camellia Cleansing Cream-to-Foam | 29 | [成分表](https://www.chanel.com/us/skincare/p/133225/la-mousse-camellia-cleansing-cream-to-foam/) |
| CL-US-039 | The Essence Foaming Cleanser | 68 | [成分表](https://www.cremedelamer.com/product/20180/26245/face/cleansers-and-toners/the-essence-foaming-cleanser) |
| CL-US-040 | The Calming Lotion Cleanser | 41 | [成分表](https://www.cremedelamer.com/product/20180/26243/face/cleansers-and-toners/the-calming-lotion-cleanser) |

数量是对来源完整列表逐项拆分后的计数，不包括公式代码、脚注、分组标题；Water/Aqua/Eau 等同一水名称只算一项。

## 仍需核对与保留空值

- CL-US-022、026、034：Clinique 美国官网与 Ulta 的完整成分披露存在成分或顺序差异。采用完整官网单一来源，brand_claims_status=version_mismatch；formula_note 标明零售 SKU 需要收到包装后确认 [待核对]。未拼接两版。
- Nordstrom 六款产品页受到访问验证：链接保留并在 purchase_links.note 标 [待核对]；这些平台的星级与评价数留空。品牌购买链接可以作为各行主购买链接。
- size_ml 留空：CL-US-021、023、024、027、032、039、040。原文只有 oz 或品牌使用 Weight/OZ 标签，未确认 fluid ounces，因此保留原文规格，避免把净重当体积。
- fragrance_free_claim 为 unknown 表示没有采集到可直接归属于该款的明确无香声明，不等于含香；没有根据全成分表推断 yes/no。
- 所有产品图片五列均空：本批没有确认开放许可图片。中国可购性统一 unknown。没有明确资料的非致痘、测试年份、浓度、频率与特殊用法不补猜。

## 评分和购买附表

- retail_ratings.csv：14 行，仅可直接读取的 Ulta 页面显示值；原样保留评价数显示，注明可能跨规格汇总，只用于展示。
- purchase_links.csv：40 行，品牌与已确认入库零售渠道各一行；不声称覆盖未核验平台。

## 后续顺序

防晒 40 → 保湿 40 → 精华/功效 → 去角质 → 点涂；每批 20。防晒仅收 SPF≥30，美国版 Drug Facts 核对 SPF、Broad Spectrum、耐水时间、药用活性浓度；不拿其他地区版本补全。本次未提前填写任何防晒数据。
