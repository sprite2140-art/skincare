# 数据格式说明

所有数据为 CSV（UTF-8）。多个值用分号 `;` 分隔。只有 `review_status = verified` 的成分参与打分。

## ingredients.csv（成分知识库）

| 字段 | 含义 | 示例 |
|---|---|---|
| inci_name | INCI 英文名（主键） | Piroctone Olamine |
| name_zh | 中文标准名 | 吡罗克酮乙醇胺盐 |
| aliases | 别名 | Octopirox |
| category | active / risk / base | active |
| functions | 功能（参考 CosIng） | anti-dandruff;preservative |
| targets | 针对的困扰（取值见下） | dandruff;scalp_itch |
| effective_range | 有效浓度范围 | |
| max_limit | 法规限量 | |
| evidence_level | A / B / C | |
| risk_tags | 风险标签（取值见下） | |
| conflicts_with | 搭配冲突的成分 | |
| explain_zh | 中文通俗解释（一两句） | |
| explain_en | 英文通俗解释 | |
| sources | 来源链接 | |
| review_status | draft / verified | draft |
| reviewed_on | 核对日期 | |

targets 取值：acne, oil, dryness, redness, pigmentation, aging, pores, dandruff, scalp_oil, scalp_itch, hair_loss, damage, frizz, flat_hair

risk_tags 取值：fragrance, essential_oil, alcohol, strong_acid, sensitizer, pregnancy_caution

## products.csv（产品库）

| 字段 | 含义 | 示例 |
|---|---|---|
| product_id | 唯一编号：品类-地区-序号 | SH-US-001 |
| brand | 品牌 | |
| name_en / name_zh | 产品名 | |
| zone | face / scalp / hair / body | scalp |
| category | 品类 | shampoo |
| region | US / JP / KR / CN | US |
| formula_note | 配方版本说明 | 美国版 |
| channels | 入库渠道 | Ulta |
| inclusion_basis | 入库依据（榜单/奖项） | |
| inci_list | 完整成分表，按包装顺序，分号分隔 | |
| price / currency | 价格 | 12 / USD |
| available_in_cn | yes / cross_border / unknown | |
| transparency | high / medium / low | |
| source_url | 成分表来源 | |
| reviewed_on | 核对日期 | |

## cities.csv（城市环境）

湿度、紫外线、季节由天气接口实时获取，这里只存不常变化的属性。

| 字段 | 含义 |
|---|---|
| city / country | 城市、国家 |
| water_hardness | soft / moderate / hard / unknown |
| source | 来源链接（当地供水部门水质报告） |
| review_status | draft / verified |
