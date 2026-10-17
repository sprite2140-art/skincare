# 数据格式说明

所有数据为 CSV（UTF-8）。多个值用分号 `;` 分隔。参与打分的成分：`review_status = verified` 的成分，以及基础成分（`category = base`，不需要人工核对）。开发测试阶段可以打开测试模式，让 draft 成分也参与打分（见 SCORING.md）。

## ingredients.csv（成分知识库）

| 字段 | 含义 | 示例 |
|---|---|---|
| inci_name | INCI 英文名（主键） | Piroctone Olamine |
| name_zh | 中文标准名 | 吡罗克酮乙醇胺盐 |
| aliases | 别名，匹配产品成分表时与 inci_name 一起查（忽略大小写和括号内俗名）。同一成分的不同写法都登记在这里，如 Aqua 的 Water、Sodium Lauroyl Methylalaninate 的 Sodium Lauroyl Methyl Alaninate | Octopirox |
| category | active / risk / base | active |
| functions | 功能（参考 CosIng，小写）。螯合剂写 `chelating`，环境适配会用到 | anti-dandruff;preservative |
| targets | 针对的困扰（取值见下） | dandruff;scalp_itch |
| effective_range | 有效浓度范围 | |
| max_limit | 法规限量 | |
| evidence_level | A / B / C | |
| risk_tags | 风险标签（取值见下） | |
| conflicts_with | 搭配冲突的成分，可在 INCI 名后加 `:severe` 标注严重冲突（严重冲突不推荐），不写视为 `mild`（只提醒） | Retinol:severe;Glycolic Acid |
| explain_zh | 中文通俗解释（一两句） | |
| explain_en | 英文通俗解释 | |
| sources | 来源链接 | |
| review_status | draft / verified | draft |
| reviewed_on | 核对日期 | |

targets 取值：

- 面部：acne, oil, dryness, redness, pigmentation, aging, pores
- 头皮：dandruff, scalp_oil, scalp_itch, scalp_redness, hair_loss
- 头发：damage, frizz, flat_hair, tangling, color_fade
- 头皮状态与发丝效果：dry_scalp（头皮干）, sensitive_scalp（敏感头皮）, clarifying（清洁残留）, shine（光泽）, curl_definition（卷度）, tone_correction（去黄 / 去橙）。目前主要来自品牌宣称（products.csv 的 claimed_benefits）；clarifying 也按成分功能辅助匹配（functions 含 chelating 的成分）

risk_tags 取值：fragrance, essential_oil, alcohol, strong_acid, sensitizer, strong_cleanser, pregnancy_caution, rx_caution

- fragrance / essential_oil / alcohol / strong_acid / sensitizer：计入刺激风险
- strong_cleanser：强清洁力表活，只对每天洗头的用户计入刺激风险
- pregnancy_caution：孕期需注意。不计入刺激风险；对怀孕 / 备孕 / 哺乳用户排除，对其他人被动提示
- rx_caution：与处方皮肤药需注意。对"正在用处方皮肤药"的用户排除

verified 成分必须填写 sources 和 reviewed_on（YYYY-MM-DD）；有 targets 的 verified 有效成分必须填写 evidence_level。`npm run validate-data` 会检查。

## products.csv（产品库）

| 字段 | 含义 | 示例 |
|---|---|---|
| product_id | 唯一编号：品类-地区-序号 | SH-US-001 |
| brand | 品牌 | |
| name_en / name_zh | 产品名 | |
| zone | face / scalp / hair / body | scalp |
| category | 品类编号（取值见下） | shampoo |
| usage_type | 使用方式：rinse_off（冲洗型）/ leave_on（免洗型）。留空则用品类默认值；卸妆、去角质必须填写 | |
| region | US / JP / KR / CN | US |
| formula_note | 配方版本说明 | 美国版 |
| channels | 入库渠道 | Ulta |
| inclusion_basis | 入库依据（榜单/奖项），原文 | |
| awards | 榜单与奖项，结果页显示为标签。每项格式 `来源\|年份\|名称\|链接`，多项用分号分隔；来源和 4 位年份必填 | Allure Best of Beauty\|2025\|敏感肌洗护组合获奖\|https://… |
| claimed_benefits | 产品定位针对的困扰或效果，取 targets 的值，分号分隔。不从成分推断 | dandruff;sensitive_scalp |
| claim_source | claimed_benefits 的来源：brand_text（产品页的品牌原文）/ data_classification（资料整理时的分类）。页面分别显示"品牌宣称"和"资料分类"，都按产品定位 0.7 计分。本轮 47 款美国产品来自资料中的"需求"字段，是整理时的分类，全部填 data_classification；"日常清洁"对应 clarifying，"去黄 / 去橙"对应 tone_correction | data_classification |
| brand_claims / brand_claims_quote / brand_claims_source_url | 品牌产品页效果的中文概括、短原文和官方产品页。概括不是逐字翻译，也不是独立验证的效果；页面显示为"品牌宣称（产品页概括）"。目前只展示，不参与计分（计分仍用 claimed_benefits） | |
| brand_claims_status | brand_page_summary（有对应版本的品牌页概括）/ version_mismatch（在售版本与品牌页不一致，留空）/ not_collected（尚未收集）。brand_claims 有内容时必须为 brand_page_summary 并有出处 | brand_page_summary |
| tested_claims | 可靠的成品测试（第三方或公开方法），每项格式 `困扰\|测试说明\|年份\|链接`，链接必填。目前没有数据 | |
| fragrance_free_claim | 产品是否明确标注 fragrance-free：yes / no / unknown。留空视为 unknown（未确认，不等于含香） | unknown |
| fragrance_free_source_url | 无香声明出处；fragrance_free_claim = yes 时必填 | |
| inci_list | 完整成分表，**英文 INCI 名**，按包装顺序，分号分隔。打分用这一列，解析时统一写法（见下方"成分名称统一"） | Aqua;Glycerin;Piroctone Olamine |
| key_actives | 品牌宣称的主打成分，**按品牌原文**保存（可带浓度、复数、复配物或技术名称，美国药品标签上的 Active Ingredient 也算），分号分隔。匹配规则见下方"主打成分匹配"。对应不上成分表的写法只作为品牌宣称展示，`validate-data` 给提示不报错。留空表示还没填写，暂按全部满分计算并提示；品牌没有单独公布时填 `Not separately disclosed`，所有有效成分按非主打计 | Pyrithione Zinc 1%; Ceramides |
| inci_list_original | 包装原文成分表（中文、日文、韩文等），原样保存，只用于展示和核对，不参与打分 | 水、甘油、吡罗克酮乙醇胺盐 |
| price / currency | 当地价格和货币代码，按销售地区存当地价格；price 必须为正数，currency 必须在 exchange_rates.csv 中 | 12 / USD |
| size_ml | 规格（毫升），正数，可留空。美国产品原始规格为 fl oz 时按 1 fl oz = 29.5735 ml 换算后取整，原文规格保留在 formula_note | 355 |
| available_in_cn | yes / cross_border / unknown | |
| transparency | high / medium / low | |
| source_url | 成分表来源链接，可有多个，用分号分隔 | https://a.example;https://b.example |
| purchase_url | 购买链接（零售商或品牌产品页）。本轮取 source_url 中与 channels 对应的零售商产品页 | https://www.ulta.com/p/… |
| paired_product_ids | 同系列的其他品类产品 ID，分号分隔，双向记录（洗发水记护发素、护发素记洗发水）。只用于显示"同系列"，不代表必须成套购买，搭配不限定同系列 | CO-US-001 |
| image_url / image_source / image_license | 产品图链接、来源、使用许可。**三项都填写时页面才展示图片**，否则用统一占位图；不得使用没有明确许可的图片 | |
| reviewed_on | 核对日期 | |

### 主打成分匹配

key_actives 按品牌原文保存，打分时这样对应到成分表（代码 `src/data/keyActives.ts`，同义写法表在 `src/scoring/config.ts` 的 `KEY_ACTIVE_SYNONYMS`）：

1. 去掉浓度（`Pyrithione Zinc 1%` → `Pyrithione Zinc`），括号内的内容单独作为一个候选（`K18PEPTIDE (sh-Oligopeptide-78)` → 也查 `sh-Oligopeptide-78`）。
2. 与成分的 INCI 名或别名相同即匹配；以 INCI 名结尾也算（`Keratin` → `Hydrolyzed Keratin`）。
3. 复数写法匹配以单数开头的成分（`Ceramides` → `Ceramide NP`、`Ceramide AP`……）；单数写法不这样匹配（`Glycine` 不匹配 `Glycine Soja Oil`）。
4. 常见俗名按同义写法表对应 INCI（`Hyaluronic Acid` → `Sodium Hyaluronate`，`Tea Tree Oil` → `Melaleuca Alternifolia Leaf Oil`）。表中没有的复配物或技术名称（如 OLAPLEX Bond Building Technology）不匹配，只作为品牌宣称展示。

### 成分名称统一

解析 inci_list 时，对每个成分名做统一处理，再去成分库匹配：

1. **去掉括号内的俗名**：`Rosmarinus Officinalis (Rosemary) Leaf Extract` → `Rosmarinus Officinalis Leaf Extract`；`Aqua (Water)` → `Aqua`。半角、全角括号都处理。
2. **`[待核对]` 标记**：整理数据时拿不准成分名是否写对，可以在名称后加 `[待核对]`（半角、全角方括号都可以）。解析时去掉这个标记，并把该成分记为"名称未核对"：不参与打分，结果页显示为"暂无数据"。安全检查（特殊状态、想避开的成分、搭配冲突）仍会看它，并标注"未核对"。
3. **大小写、多余空格不影响匹配**：`AQUA` 与 `Aqua` 视为同一成分。
4. **拼写不同的写法不会自动合并**（如 `Methylalaninate` 和 `Methyl Alaninate`），要在 ingredients.csv 对应成分的 aliases 里登记，匹配时会同时查主名和别名。
5. **"INCI 名/俗名"写法**：整体查不到、且名称中有斜杠时，用斜杠前的部分再查一次（`Glycine Soja Oil/ Soybean Oil` → `Glycine Soja Oil`）。只取斜杠前的部分，本身带斜杠的 INCI 名（如 `Hippophae Rhamnoides Fruit/Seed Oil`）不会被拆错。
6. **成分频率统计**（`npm run ingredient-frequency`，以及 `npm run validate-data` 里的"不在成分库"清单）按统一后的名称合并计算：在库的成分按成分库主名合并（包括别名），不在库的按统一后的名称合并；同一产品里重复出现只算一次。

category 取值：

- 面部：makeup_remover（卸妆）, cleanser（洁面）, toner（化妆水）, serum（精华）, moisturizer（面霜）, sunscreen（防晒）, exfoliator（去角质）
- 头皮：shampoo（洗发水）, scalp_care（头皮护理）
- 头发：conditioner（护发素）, hair_mask（发膜）, leave_in（免洗护发乳）, hair_oil（护发油）。本轮页面实现洗发水和护发素；发膜、免洗护发乳、护发精油已预留品类和使用方式
- 身体：body_wash（沐浴露）, body_lotion（身体乳）, body_scrub（身体去角质）

usage_type 品类默认值（冲洗型产品的刺激风险扣分减半）。个别产品与默认不同时，在该产品行填写 usage_type 覆盖：

| 默认值 | 品类 |
|---|---|
| rinse_off | cleanser, shampoo, conditioner, hair_mask, body_wash, body_scrub |
| leave_on | toner, serum, moisturizer, sunscreen, scalp_care, leave_in, hair_oil, body_lotion |
| 无默认值，必须逐个填写 | makeup_remover, exfoliator |

卸妆和去角质的填法：卸妆油、卸妆膏、磨砂膏、含酸洁面填 rinse_off；卸妆水、酸类爽肤水和精华填 leave_on。

### 预算档位（自动计算，不用手填）

预算题按品类分别提供三个选项，界线由产品库价格自动算出：

1. 取该品类所有有价格的产品，用 exchange_rates.csv 把价格统一换算成 USD。
2. 第一档上限 = 这些价格的 33% 分位数，第二档上限 = 67% 分位数，第三档 = 不限。分位数用线性插值（与 Excel 的 PERCENTILE.INC 相同）。
3. 有价格的产品少于 3 个的品类，暂不提供预算档位，只有"不限"。
4. 问卷选项显示算出的具体上限，并换算成用户所在地货币，例如"≤ ¥80 / ≤ ¥200 / 不限"（约数取整：1000 以上取整到百位，其余取整到个位）；筛选时用 USD 精确值比较，等于上限的产品保留。
5. 没有价格（或币种不在汇率表）的产品不参与分位数计算；用户选了第一档或第二档时不显示它们，只在"不限"档出现。
6. 问卷也可以自填上限（单品），或在洗护搭配时"按整套"自填总预算；金额按用户所在地货币保存，比较时换算成 USD。没有符合条件的商品时页面明确提示，不自动放宽条件。
7. 每次产品数据或汇率更新后，界线在构建时自动重新计算；用户档案保存的是"第几档"，不是金额，所以不用重填。`npm run validate-data` 会打印当前各品类的界线。

## cosing_ingredients.csv 与 eu_fragrance_allergens.csv（欧盟成分基础分类）

- **cosing_ingredients.csv**：欧盟 CosIng "Ingredients & Fragrance Inventory" 的转换结果，列为 inci_name、functions（登记功能，小写，分号分隔）、cas_no、cosing_ref、update_date。不要手改：从 CosIng 下载导出 CSV 后运行 `npm run import-cosing -- <文件>` 重新生成（脚本会自动找表头，逗号或分号分隔都可以）。目前为空，等待导入。
- **eu_fragrance_allergens.csv**：欧盟需标注的香料致敏原清单（inci_name、list、source）。目前收录法规 1223/2009 附录 III 的 26 种；2023/1545 号法规新增的条目待按法规原文补充。
- **合并规则**（`src/data/cosing.ts` 的 expandIngredients）：成分库 ingredients.csv 优先；成分库没有的成分用 CosIng 补充，来源标记为 CosIng、review_status 为 draft。登记功能含 perfuming 的识别为加香成分（category = risk，risk_tags = fragrance）；其他为基础分类（category = base，没有 targets）。在致敏原清单上的成分都标注为欧盟致敏原；成分库和 CosIng 都没有的致敏原按清单补条目。打分仍按现有规则区分已核对和未核对。
- **网页只打包用到的部分**：CosIng 全表有数万行，构建时只保留产品成分表中出现的成分（vite.config.ts 的 cosing-used 插件）；测试和脚本读取完整文件。

## exchange_rates.csv（固定汇率表）

用于把产品的当地价格换算成 USD，与用户的单件预算上限比较；给用户展示预算选项时再换算成当地货币。

汇率采用美联储 H.10 官方汇率（https://www.federalreserve.gov/releases/h10/current/ ），按 H.10 的报价方式记录"1 USD 兑多少该货币"。**每次更新产品数据（尤其是价格）时，同步更新汇率表**：取最新一期 H.10，所有币种用同一个数据日期，并更新 data_date。

| 字段 | 含义 | 示例 |
|---|---|---|
| currency | 货币代码（3 位大写）；必须有 USD 一行，per_usd 为 1 | JPY |
| per_usd | 1 USD 兑多少该货币 | 158.3400 |
| data_date | 数据日期，即汇率对应的日期（不是 H.10 的发布日期），YYYY-MM-DD | 2026-10-09 |
| source | 来源链接 | https://www.federalreserve.gov/releases/h10/current/ |

当前数据：2026 年 10 月 13 日发布的 H.10 中 10 月 9 日的汇率。

## water_hardness.csv（水硬度记录）

每行是一个供水系统、水厂、水源或配水点在某个时期的数据，一个城市可以有多行（例如洛杉矶 6 个水源、费城 3 个水厂）。列沿用资料提供的 21 列（region_id、geographic_scope、statistic_type、hardness_value_mg_L_CaCO3、reported_range_min/max、hardness_class、sample_period、confidence_for_household_tap、formula_note、source_url、retrieved_on 等），前面加 city、country 两列对应 cities.csv。

- 数值单位 mg/L，以 CaCO3 计；hardness_class 按 USGS：≤60 soft，>60–120 moderately_hard，>120–180 hard，>180 very_hard；跨两级的写 hard_or_very_hard 或 moderately_hard_or_hard；官方报告没有数值的写 unknown。
- **不按同城记录平均，也不以第一条代表全市。** 城市等级由记录汇总（`summarizeHardness`）：所有记录等级相同时取该等级；都属于硬或很硬时取"硬"；其他不一致或跨两级时为 varies（"因供水分区而异"，环境适配按中性计分）；没有分级记录为 unknown。
- 页面逐条显示分区、口径（年均、单次、范围、月均、由钙镁换算等）、数值或范围、时期、来源和资料备注。
- 现有 20 个城市有记录（2026-10-16、10-17 核对）。Miami、Atlanta 官方报告没有总硬度数值，保持 unknown；San Jose、Irvine 尚无记录。

## cities.csv（城市环境）

湿度、紫外线、季节由天气接口实时获取，这里只存不常变化的属性。

| 字段 | 含义 |
|---|---|
| city / country | 城市、国家 |
| review_status | draft / verified。只有 verified 城市的水硬度参与环境适配；测试模式下 draft 的也参与 |

水硬度见 water_hardness.csv。旧格式（直接写 water_hardness 列）仍可读取，没有分区记录时沿用。

