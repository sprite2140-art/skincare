# 数据格式说明

所有数据为 CSV（UTF-8）。多个值用分号 `;` 分隔。只有 `review_status = verified` 的成分参与打分。

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
| inclusion_basis | 入库依据（榜单/奖项） | |
| inci_list | 完整成分表，**英文 INCI 名**，按包装顺序，分号分隔。打分用这一列，解析时统一写法（见下方"成分名称统一"） | Aqua;Glycerin;Piroctone Olamine |
| inci_list_original | 包装原文成分表（中文、日文、韩文等），原样保存，只用于展示和核对，不参与打分 | 水、甘油、吡罗克酮乙醇胺盐 |
| price / currency | 当地价格和货币代码，按销售地区存当地价格；price 必须为正数，currency 必须在 exchange_rates.csv 中 | 12 / USD |
| size_ml | 规格（毫升），正数，可留空 | 400 |
| available_in_cn | yes / cross_border / unknown | |
| transparency | high / medium / low | |
| source_url | 成分表来源链接，可有多个，用分号分隔 | https://a.example;https://b.example |
| reviewed_on | 核对日期 | |

### 成分名称统一

解析 inci_list 时，对每个成分名做统一处理，再去成分库匹配：

1. **去掉括号内的俗名**：`Rosmarinus Officinalis (Rosemary) Leaf Extract` → `Rosmarinus Officinalis Leaf Extract`；`Aqua (Water)` → `Aqua`。半角、全角括号都处理。
2. **`[待核对]` 标记**：整理数据时拿不准成分名是否写对，可以在名称后加 `[待核对]`（半角、全角方括号都可以）。解析时去掉这个标记，并把该成分记为"名称未核对"：不参与打分，结果页显示为"暂无数据"。安全检查（特殊状态、想避开的成分、搭配冲突）仍会看它，并标注"未核对"。
3. **大小写、多余空格不影响匹配**：`AQUA` 与 `Aqua` 视为同一成分。
4. **拼写不同的写法不会自动合并**（如 `Methylalaninate` 和 `Methyl Alaninate`），要在 ingredients.csv 对应成分的 aliases 里登记，匹配时会同时查主名和别名。
5. **成分频率统计**（`npm run ingredient-frequency`，以及 `npm run validate-data` 里的"不在成分库"清单）按统一后的名称合并计算：在库的成分按成分库主名合并（包括别名），不在库的按统一后的名称合并；同一产品里重复出现只算一次。

category 取值：

- 面部：makeup_remover（卸妆）, cleanser（洁面）, toner（化妆水）, serum（精华）, moisturizer（面霜）, sunscreen（防晒）, exfoliator（去角质）
- 头皮：shampoo（洗发水）, scalp_care（头皮护理）
- 头发：conditioner（护发素）, hair_mask（发膜）, hair_oil（护发油）
- 身体：body_wash（沐浴露）, body_lotion（身体乳）, body_scrub（身体去角质）

usage_type 品类默认值（冲洗型产品的刺激风险扣分减半）。个别产品与默认不同时，在该产品行填写 usage_type 覆盖：

| 默认值 | 品类 |
|---|---|
| rinse_off | cleanser, shampoo, conditioner, hair_mask, body_wash, body_scrub |
| leave_on | toner, serum, moisturizer, sunscreen, scalp_care, hair_oil, body_lotion |
| 无默认值，必须逐个填写 | makeup_remover, exfoliator |

卸妆和去角质的填法：卸妆油、卸妆膏、磨砂膏、含酸洁面填 rinse_off；卸妆水、酸类爽肤水和精华填 leave_on。

### 预算档位（自动计算，不用手填）

预算题按品类分别提供三个选项，界线由产品库价格自动算出：

1. 取该品类所有有价格的产品，用 exchange_rates.csv 把价格统一换算成 USD。
2. 第一档上限 = 这些价格的 33% 分位数，第二档上限 = 67% 分位数，第三档 = 不限。分位数用线性插值（与 Excel 的 PERCENTILE.INC 相同）。
3. 有价格的产品少于 3 个的品类，暂不提供预算档位，只有"不限"。
4. 问卷选项显示算出的具体上限，并换算成用户所在地货币，例如"≤ ¥80 / ≤ ¥200 / 不限"（约数取整：1000 以上取整到百位，其余取整到个位）；筛选时用 USD 精确值比较，等于上限的产品保留。
5. 每次产品数据或汇率更新后，界线在构建时自动重新计算；用户档案保存的是"第几档"，不是金额，所以不用重填。`npm run validate-data` 会打印当前各品类的界线。

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

## cities.csv（城市环境）

湿度、紫外线、季节由天气接口实时获取，这里只存不常变化的属性。

| 字段 | 含义 |
|---|---|
| city / country | 城市、国家 |
| water_hardness | soft / moderate / hard / unknown |
| source | 来源链接（当地供水部门水质报告） |
| review_status | draft / verified（只有 verified 城市的水硬度参与环境适配） |
