# 数据格式说明

所有数据为 CSV（UTF-8）。多个值用分号 `;` 分隔。只有 `review_status = verified` 的成分参与打分。

## ingredients.csv（成分知识库）

| 字段 | 含义 | 示例 |
|---|---|---|
| inci_name | INCI 英文名（主键） | Piroctone Olamine |
| name_zh | 中文标准名 | 吡罗克酮乙醇胺盐 |
| aliases | 别名，匹配产品成分表时使用（忽略大小写）。同义 INCI 名也写在这里，如 Aqua 的别名 Water | Octopirox |
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
| region | US / JP / KR / CN | US |
| formula_note | 配方版本说明 | 美国版 |
| channels | 入库渠道 | Ulta |
| inclusion_basis | 入库依据（榜单/奖项） | |
| inci_list | 完整成分表，按包装顺序，分号分隔 | |
| price / currency | 当地价格和货币代码，按销售地区存当地价格；currency 必须在 exchange_rates.csv 中 | 12 / USD |
| available_in_cn | yes / cross_border / unknown | |
| transparency | high / medium / low | |
| source_url | 成分表来源 | |
| reviewed_on | 核对日期 | |

category 取值：

- 面部：makeup_remover（卸妆）, cleanser（洁面）, toner（化妆水）, serum（精华）, moisturizer（面霜）, sunscreen（防晒）, exfoliator（去角质）
- 头皮：shampoo（洗发水）, scalp_care（头皮护理）
- 头发：conditioner（护发素）, hair_mask（发膜）, hair_oil（护发油）
- 身体：body_wash（沐浴露）, body_lotion（身体乳）, body_scrub（身体去角质）

冲洗型品类（刺激风险扣分减半）：cleanser, shampoo, conditioner, hair_mask, body_wash, body_scrub。卸妆和去角质有免洗型产品，暂按免洗处理。

## exchange_rates.csv（固定汇率表）

用于把当地价格换算成 USD 后归入价格档；给用户展示时仍用当地货币。随数据一起更新。

| 字段 | 含义 | 示例 |
|---|---|---|
| currency | 货币代码（3 位大写） | JPY |
| usd_per_unit | 1 单位该货币等于多少 USD | 0.0067 |
| as_of | 汇率日期（YYYY-MM-DD） | 2026-10-16 |
| source | 汇率来源链接 | |

## cities.csv（城市环境）

湿度、紫外线、季节由天气接口实时获取，这里只存不常变化的属性。

| 字段 | 含义 |
|---|---|
| city / country | 城市、国家 |
| water_hardness | soft / moderate / hard / unknown |
| source | 来源链接（当地供水部门水质报告） |
| review_status | draft / verified（只有 verified 城市的水硬度参与环境适配） |
