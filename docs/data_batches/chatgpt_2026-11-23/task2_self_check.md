# 低价候选自查

**部分完成：18款，21个需求/预算组合中12个达到候选数量、9个仍未达到。** 候选按ceil(需补×1.5)计算；第二档按不超过该上限累计统计，同一低价商品可同时覆盖两档。

|品类|需求|档位|上限USD|目标候选|本次合格|仍缺|
|---|---|---|---:|---:|---:|---:|
|cleanser|acne|q1|12.99|2|2|0|
|cleanser|oil|q1|12.99|2|2|0|
|exfoliator|oil|q1|9.49|3|3|0|
|exfoliator|oil|q2|18.49|2|4|0|
|exfoliator|pigmentation|q1|9.49|3|1|2|
|shampoo|scalp:dry_tight|q1|10.99|2|2|0|
|shampoo|scalp:dry_tight|q2|20.0|2|3|0|
|shampoo|scalp:sensitive|q1|10.99|3|0|3|
|shampoo|goal:volume|q1|10.99|2|2|0|
|shampoo|goal:shine|q1|10.99|2|2|0|
|shampoo|goal:shine|q2|20.0|2|2|0|
|shampoo|goal:tone_yellow|q1|10.99|3|1|2|
|shampoo|goal:tone_yellow|q2|20.0|3|2|1|
|shampoo|goal:tone_orange|q1|10.99|5|0|5|
|shampoo|goal:tone_orange|q2|20.0|5|0|5|
|shampoo|goal:color_care|q1|10.99|2|2|0|
|shampoo|goal:color_care|q2|20.0|2|2|0|
|conditioner|goal:volume|q1|10.99|2|2|0|
|conditioner|goal:tone_yellow|q1|10.99|3|0|3|
|conditioner|goal:tone_yellow|q2|24.5|2|1|1|
|conditioner|goal:tone_orange|q1|10.99|3|0|3|

逐行入库依据见 products.inclusion_basis、retail_ratings 和 inclusion_evidence.json，含直接页、显示数字、核对日期。没有用零售商搜索结果数量、商品描述的bestselling、徽章或第三方转述充数。Sephora1.5K、Walmart16.1K保留原显示，精确rating_count留空；没有把ratings写成同数量文字评论。

EX油控制需求中up&up/Noxzema等按用户允许的水杨酸成分依据覆盖，未伪造品牌控油宣称。EX027/028不因此自动增加claimed_benefits=oil；网站若只筛宣称字段，这两款可能仍不显示在控油筛选中，需网站按既有有效成分逻辑处理。EX031价格9.20仅略低于9.49，不能视为解决分位线继续下移的保证。

配方：每行只选一个完整成分来源。Drug Facts用同一页活性+非活性；Neutrogena洁面未拼接同页不同面板；Noxzema FDA重复Geraniol原样保留。Pink Grapefruit官方拆写Sodium, Benzotriazolyl...保留并标[待核对]。L'Oréal/Garnier FIL代码不当成分。key_actives均为所选INCI中实际字串。品牌技术名未写入key_actives。subtype全空。

洗护：紫色只算去黄，未把紫色补到明确要求蓝色的去橙缺口。Matrix Brass Off、Joico Blue、dpHUE及已有其他商品按当前主表去重，不重复新编；儿童/婴儿及干洗喷雾未选。容量为单瓶零售规格，没有按套装拆价；Aussie30.4oz为常规零售泵瓶，非1升沙龙装。

Jhirmack当前品牌无硫酸盐完整配方与Walmart当前无硫酸盐/甘油描述对应，旧URL及变体名仍带collagen；未采用旧Instacart胶原蛋白配方，更未混拼。品牌拼写Polyquaterinum-7保留并标[待核对]。Garnier品牌“no silicones”文案与完整INCI含DIMETHICONE矛盾：已注明，不授予silicone-free标签。不同零售商完整INCI未逐瓶验证的，不宣称瓶身版本绝对一致；此项严格一致要求仅在任务1逐项验证。

不合格候选、金额和原因见task2_held_candidates.csv；这些没有编号、没有写进products，也没有计入覆盖。未找到合格候选不等于证明美国市场不存在。此包未满足全部候选配额，尤其蓝色调低价洗护与敏感头皮方向仍需后续补查，不能结单为全量完成。
