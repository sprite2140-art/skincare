# 本次低价补缺自查报告
核查日期：2026-11-02。仅包含本次新增产品；不重复此前批次或 SE-US-005–008 链接文件。

## 数量、格式、价格与去重
去角质 EX-US-021–026、洁面 CL-US-041–046、保湿 MO-US-041–046，各 6 款，共 18 款。产品表与已验收模板的 50 列名称、顺序完全一致；另附每类购买链接表及评价表，共 9 个 CSV，UTF-8 BOM。逐格导出回读一致。
与已验收去角质 20、洁面 40、保湿 40 款按品牌和英文名称标准化去重，无重复，接续编号。每品类同品牌累计不超过 4 款。此为明确指定的低价补缺，不适用高价单品配额。

|品类|新增数|上限|本批最高常规参考价|明确无香数|
|---|---:|---:|---:|---:|
|EX|6|$13.00|$10.99|1|
|CL|6|$15.00|$12.59|5|
|MO|6|$14.00|$9.97|4|

## 肤质与困扰覆盖
以下为品牌适用肤质和原文宣称的分类映射，不等同于疗效保证；未明示的肤质不补推断。Soothing/calming 映射 redness，不等同于品牌明示“治疗红斑”。

### EX
- oily：EX-US-024, EX-US-026
- dry：EX-US-021
- combination：EX-US-024
- sensitive：EX-US-021, EX-US-024
- acne：EX-US-021, EX-US-022, EX-US-023
- redness：EX-US-021
- dryness：EX-US-024, EX-US-025

### CL
- oily：CL-US-041, CL-US-046
- dry：CL-US-042, CL-US-046
- combination：CL-US-041, CL-US-046
- sensitive：CL-US-041, CL-US-042, CL-US-043, CL-US-044, CL-US-046
- acne：CL-US-045
- redness：CL-US-045
- dryness：CL-US-042, CL-US-043, CL-US-044, CL-US-046

### MO
- oily：MO-US-044
- dry：MO-US-041, MO-US-042, MO-US-045, MO-US-046
- combination：MO-US-044
- sensitive：MO-US-041, MO-US-042, MO-US-046
- acne：MO-US-044
- redness：MO-US-042
- dryness：MO-US-041, MO-US-042, MO-US-043, MO-US-044, MO-US-045, MO-US-046

## 酸类免洗
EX-US-021：水杨酸 0.5%；EX-US-022、EX-US-023：水杨酸 2%。均为免洗型。Peach Slices 配方还列有乳酸、果酸，但未公开浓度，未推测。其余 3 款为冲洗型物理去角质；含酸成分不自动认定为披露浓度的酸类免洗产品。

## 直接入库依据
18 款均记录允许零售商直接商品页 ≥1,000 的评价/评分依据，逐条 URL、显示数、统计口径见零售评价表及 source_audit.json。未以描述中的 bestselling、搜索摘要或不足 1,000 的页面单独入库。部分参考购买渠道评价不足门槛时，另列满足门槛的直接商品页，保留不达标渠道的实际数。
Amazon 仅作为直接评分证据，本次未把未核实的 Buy Box 卖家称为品牌官方店。Stridex 的 Amazon 55 片评价与 Walmart 90 片参考规格属于同一产品线，不声称评价仅来自 90 片。其他页面也可能合并规格或同步评价。Cetaphil 乳液页面显示 38K，原样保留，精确数留空。

## 价格、规格与在售判断
使用页面单瓶/单罐参考规格；不以订阅、优惠券、满件优惠或套装除价凑预算。价格与配送地区、时间有关；本次核查不代表下单库存承诺。
MO-US-044 采用 Walgreens 官方分类商品卡常规价 $7.99；其商品页返回 403，不列为已验证购买入口。实际购买入口及入库评分来自 Walmart；Walmart $5.97 为促销，未作为常规参考价。
EX-US-026 Walmart SEO 标题含 Pack of 2，但实际主区域明确 Multipack Quantity: 1 / $5.56，2 件为 $11.12；选择的是单罐。e.l.f. 洁面为常规 162mL / $11，不是旧价或迷你装。BYOMA 当前 $14.99 超预算，已剔除。
净重盎司、克和棉片数量不换算 mL；美国液量盎司按原模板换算并取整，formula_note 标明是换算值。Garnier 为免冲洗洁肤水；CeraVe 修复膏及 Cetaphil 身体面部两用乳均有品牌面部用法，修复膏应在清洁、保湿后使用，并非轻薄凝胶替代品。

## 成分与版本限制
每行只使用一个完整成分来源；药用产品记录 Drug Facts 防晒以外的药物活性浓度。完整 INCI 不拼接多个版本。无香仅按品牌或标签明确标示。
EX-US-022 官网 ethylhexlglycerin、MO-US-044 FDA 叙述 Magnessium Aluminum Silicate 疑似拼字问题：保留原文，并在 formula_note 标 [待核对]，未擅自更正。
MO-US-042 采用 Target 完整 31 项成分表，官网存在合并词和排序差异；MO-US-044 采用新无香版 FDA 标签，旧零售成分不同；MO-US-045 使用品牌当前 39 项成分表，旧零售披露不同。这三行已标 retail_mismatch，导入方应保留标记，不视为版本冲突已消失。

## 逐款核查摘要
|编号|名称|USD|INCI 项数|无香明确宣称|
|---|---|---:|---:|---|
|EX-US-021|Sensitive Pads with Aloe|4.47|14|no|
|EX-US-022|Maximum Pads|4.47|12|no|
|EX-US-023|Acne Exfoliating Toner|10.99|14|yes|
|EX-US-024|Extra Gentle Daily Scrub|9.49|20|no|
|EX-US-025|Hydro Boost Gentle Exfoliating Cleanser|9.99|17|no|
|EX-US-026|Fresh Skin Apricot Scrub|5.56|24|no|
|CL-US-041|Daily Facial Cleanser Fragrance Free|12.59|12|yes|
|CL-US-042|Gentle Foaming Cleanser|9.99|12|yes|
|CL-US-043|Calm + Restore Nourishing Oat Cleanser|9.99|16|yes|
|CL-US-044|SkinActive Micellar Cleansing Water All-in-1|8.99|7|yes|
|CL-US-045|Acne Clarifying Cleanser|10.99|20|yes|
|CL-US-046|Holy Hydration! e.l.f.ssential Daily Cleanser|11.00|21|no|
|MO-US-041|Moisturizing Lotion|9.97|16|yes|
|MO-US-042|Redness Relieving Night Moisturizer|9.59|31|yes|
|MO-US-043|Daily Hydration Moisturizer|9.00|31|no|
|MO-US-044|Essentials Dual Action Moisturizer|7.99|21|yes|
|MO-US-045|Dry Skin Cream|5.89|39|no|
|MO-US-046|Healing Ointment|7.97|22|yes|

## 文件完整性
9 个 CSV 均逐格回读核验；3 张产品表各 6 行、50 列，编号连续且唯一，价格不超用户上限，三个品类均覆盖四种肤质及三类困扰；3 款酸类免洗已验证。详见 validation_report.json。
