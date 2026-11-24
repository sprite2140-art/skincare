# 本次补查自查报告

核对日期：2026-11-23。最终基线为本次重新读取的main products.csv，并与上一包新增18款共同去重；本次没有重复交付旧行。

## 精华：已解决1款，仍有2款

SE-US-007：Target75mL SKU91980436现售标签区保留Tocopherol，9项成分的名称与顺序与main逐项一致；只归一化分隔符和大小写，没有补入或移除成分。直接页面：https://www.target.com/p/-/A-91980436 。常规价11.99美元，75mL；参考价和容量已同步调整；评分4.81、1471 ratings取本次页面公开嵌入统计。搜索缓存曾显示1450，未拼用旧计数。原INCI、原inci_list_original、现有品牌version_mismatch状态保留。30mL Target/Ulta目前缺Tocopherol的版本不恢复链接。

SE-US-005：**找不到一致的版本**。Target75mL SKU91980505仍列10项，缺原11项末尾Tocopherol；30mL搜索缓存中出现含Tocopherol的旧文案，但本次已保存页面的现售标签数据不支持，不能将旧缓存当作当前旧版库存证明。Beautylish页面未提供可核对的完整成分，不能推定一致。

SE-US-006：**找不到一致的版本**。Target75mL SKU91980406虽然列出Tocopherol，但1,2-Hexanediol与Glycerin顺序和原表不同，并将Ammonium Acryloyldimethyltaurate/VP Copolymer用多余逗号拆开。未因末项相同就宣称整表一致，也未用同浓度可能允许调序的猜测放行。30mL仍缺Tocopherol。Beautylish未提供完整成分证据。

这两款未恢复购买链接，也未用现售不同版本评价数覆盖旧配方的评分行。完整现售备选成分已在上一包提供；本包仅报告本轮新增核查结果。

## 新增4款及入库依据

|编号|商品|单瓶常规价USD|规格|合格依据|预算需求|
|---|---|---:|---|---|---|
|SH-US-093|California Naturals Sensitive Scalp Shampoo|9.99|16.5fl oz /488mL|NewBeauty2026 Best Fragrance-Free Shampoo|敏感头皮，最低档|
|SH-US-094|Head & Shoulders BARE Sensitive Scalp Care|9.99|13.5fl oz /400mL|Newsweek/BrandSpark2026 Best New Product，Anti-Dandruff Shampoo & Conditioner|敏感头皮，最低档|
|SH-US-095|Hair Biology Silver & Glowing Silver Shampoo|9.97|12.8fl oz /380mL|NewBeauty2021 Best Shampoo for Gray Hair|去黄，最低档及第二档|
|SH-US-096|Suave Bonding Infusion Purple Shampoo|4.84|28fl oz /828mL|Oprah2025 Beauty O-Wards Best Purple Shampoo|去黄，最低档及第二档|

本次补查的关键是新取得**具体产品的美容奖项直接依据**，并非把低评价数视为通过。各行源网址、奖项年份、页面显示评级、核对日期已分别填入products、retail_ratings、source_evidence。没有将品牌整系列、认证封章或其他产品奖项移植过来。SH-US-094获奖类别属于主办方健康/美容/个人护理大类；明确记录为该具体获奖产品，不写成Allure或NewBeauty奖。

直接获奖页：

- California Naturals：https://www.newbeauty.com/awards/2026/hair/sensitive-scalp-shampoo
- Head & Shoulders：主办方发布的2026获奖表，https://www.prnewswire.com/news-releases/newsweek-and-brandspark-international-announce-the-18th-annual-2026-best-new-product-awards-winners-spotlighting-the-new-products-that-stand-out-to-americans-302671698.html
- Hair Biology：https://www.newbeauty.com/view/beauty-awards-2021-hair-staples （Best Shampoo for Gray Hair条目）
- Suave：https://www.oprahdaily.com/beauty/a65616229/oprah-beauty-awards-2025/ （Best Purple Shampoo条目）

SH-US-093的NewBeauty页标价12美元，不用作预算价；本次预算参考为Target常规9.99。SH-US-094的3美元优惠券不计；完整Drug Facts为活性1%加7项非活性。它与上一包SH-US-085的有香9项配方不同，不按同一产品的容量变体计数。SH-US-095的完整US品牌Ingredients折叠区在公开嵌入页面数据中，已提取全21项；未拼接加拿大零售版本的不同顺序。SH-US-096选择Walmart Pack Size1常规4.84，不把4瓶24.90折算；通用描述误写4pack，说明中已指出。其751ratings不够按评价入库，本次依据是新核实的获奖项。

**入库类型补丁必须一起导入**：这4款inclusion_basis_type=beauty_award。原50列模板不含此列，但main有；因此单独交付2列补丁，不更改products模板。若只导入50列且遗漏补丁，网站仍可能显示入库依据待补。

## 数量变化

|需求/档位|目标候选|上一包合格|本次新增|累计合格|仍缺|
|---|---:|---:|---:|---:|---:|
|敏感头皮洗发水，最低档|3|0|2|2|1|
|去黄洗发水，最低档|3|1|2|3|0|
|去黄洗发水，第二档|3|2|2|4|0|

累计使用上一包候选计算，不把上一包产品当作本次新增重发。去黄洗发水的2个需求/预算组合已关闭；其余未完成组合由9个降到7个。各档仍按用户给定上限累计计算，没有重新计算网站分位线，也没有保证入库后自动变化的分位线不会再次降低。

## 仍缺的7个组合

- exfoliator / pigmentation / q1，上限$9.49：目标3，累计1，还缺2。
- shampoo / scalp:sensitive / q1，上限$10.99：目标3，累计2，还缺1。
- shampoo / goal:tone_orange / q1，上限$10.99：目标5，累计0，还缺5。
- shampoo / goal:tone_orange / q2，上限$20.0：目标5，累计0，还缺5。
- conditioner / goal:tone_yellow / q1，上限$10.99：目标3，累计0，还缺3。
- conditioner / goal:tone_yellow / q2，上限$24.5：目标2，累计1，还缺1。
- conditioner / goal:tone_orange / q1，上限$10.99：目标3，累计0，还缺3。

本轮对未补齐方向也进行了补查：

- 低价蓝色调洗护：新核实John Frieda Blue Crush获NewBeauty2021 Best Shampoo for Brunettes，但已核查Walmart8.3oz缺货；旧文章10美元不代表当前单瓶在售价。Not Your Mother's Triple Threat Blue的直接Walmart页404。Fanola原No Orange350mL超过20美元；Wonder No Orange只8–9ratings，未取得同款具名奖项，不能把原No Orange评价/奖项混过去。现有Matrix/Joico/dpHUE不作为新增产品重复编号。紫色产品不替蓝色去橙。
- 去黄护发素：Hair Biology单瓶9.97但489ratings，未取得同款护发素奖项；洗发水获奖不转给护发素。Matrix So Silver Purple Pigmented Conditioner24美元、117Reviews，未满足入库依据；旧So Silver非染色护发素的配方和旧评价不移到新紫色染色配方。Eva NYC Tone It Down在Sally273，且Sally评价不在允许评价平台中，未入库。
- 敏感头皮：Aveeno Rosewater & Chamomile的Walmart254ratings不足；Clinical Dandruff Defense Sensitive的Walmart335ratings、20.85且缺货；California Naturals的Eczema Seal本身没有被当成美容大奖，本次是另外核实NewBeauty具体获奖。
- 低价暗沉去角质：The Ordinary乳酸5%/杏仁酸10%仍缺允许平台合格依据；@cosme“品牌新人奖”不是这些单品获奖，未采用。Freeman炭黑糖抛光面膜确有Allure2013及Readers' Choice2016奖项，但已核查单瓶Walmart9.99超过9.49；品牌页没有可见有效售价，隐藏1美元数值不被当作可靠单瓶价。低价第三方/地区库存线索未擅自当作已核实价格。

没有降低评价门槛、推测缺失成分、用促销价或套装折算价凑数。未补齐不等于已证明市场上绝对不存在。

## 格式及数据自查

products50列与上一包顺序一致；4个新编号不与main及上一包碰撞；品牌+英文名去重通过；新增subtype全空；key_actives均为所选INCI的实际字串；没有把品牌技术名写入成分；成分只来自一份完整品牌或零售表。California Naturals保留页面明确的fragrance-free，不根据含植物油反向改写品牌宣称。

此次4款的品牌独立原文结构字段暂未填充，status=not_collected，诉求只按已记录的厂家产品文案做data_classification；没有编造品牌测试结果。紫色诉求仅填tone_yellow，不填tone_orange。原始CSV按UTF-8 BOM写出，经表格工具逐格回读及ZIP完整性验证。

任务状态仍为部分完成：剩余SE-US-005/006及7个需求/预算组合，没有将其标记为完成。
