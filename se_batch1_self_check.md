# SE 第1批补核自查（2026-10-24）

1. 数量与编号：入库依据、购买链接、评分表各20行；ID连续唯一，引用已有ID，不新增产品。有效入库依据5行；其余none仅表示本轮未核到，不代表产品不在所有榜单。
2. 表头：inclusion为用户指定2列；purchase_links为模板6列；retail_ratings为模板9列。原products仍为50列，本轮没有声称已修完原产品表。
3. 成分表：本轮未重新核实配方；以下为已有稿的单源记录及分号项数，不是本轮确认成分正确。未把1,2-Hexanediol按逗号拆分。
- SE-US-001：11项；https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html；brand_claims_status=brand_page_quote
- SE-US-002：17项；https://theordinary.com/en-us/azelaic-acid-suspension-10-exfoliator-100407.html；brand_claims_status=brand_page_quote
- SE-US-003：32项；https://theordinary.com/en-us/retinal-02-emulsion-100646.html；brand_claims_status=brand_page_quote
- SE-US-004：15项；https://theordinary.com/en-us/alpha-arbutin-2-ha-serum-100401.html；brand_claims_status=brand_page_quote
- SE-US-005：11项；https://v1.goodmolecules.com/products/discoloration-correcting-serum；brand_claims_status=version_mismatch
- SE-US-006：10项；https://v1.goodmolecules.com/products/niacinamide-serum；brand_claims_status=version_mismatch
- SE-US-007：9项；https://v1.goodmolecules.com/products/hyaluronic-acid-serum；brand_claims_status=version_mismatch
- SE-US-008：23项；https://v1.goodmolecules.com/products/gentle-retinol-cream；brand_claims_status=version_mismatch
- SE-US-009：16项；https://naturium.com/products/niacinamide-serum-12-plus-zinc-2；brand_claims_status=brand_page_quote
- SE-US-010：18项；https://naturium.com/products/azelaic-acid-derivative-complex-10；brand_claims_status=brand_page_quote
- SE-US-011：35项；https://naturium.com/products/vitamin-c-complex-serum；brand_claims_status=brand_page_quote
- SE-US-012：47项；https://naturium.com/products/multi-peptide-advanced-serum；brand_claims_status=brand_page_quote
- SE-US-013：13项；https://www.theinkeylist.com/products/beta-hydroxy-acid-serum；brand_claims_status=brand_page_quote
- SE-US-014：23项；https://www.theinkeylist.com/products/tranexamic-acid-serum；brand_claims_status=brand_page_quote
- SE-US-015：40项；https://www.theinkeylist.com/products/ectoin-hydro-barrier-serum；brand_claims_status=brand_page_quote
- SE-US-016：36项；https://www.theinkeylist.com/products/starter-retinol；brand_claims_status=brand_page_quote
- SE-US-017：18项；https://bluemercury.com/products/skinceuticals-c-e-ferulic?view=json；brand_claims_status=brand_page_quote
- SE-US-018：19项；https://bluemercury.com/products/skinceuticals-p-tiox?view=json；brand_claims_status=brand_page_quote
- SE-US-019：33项；https://www.cerave.com/skincare/facial-serums/resurfacing-retinol-serum；brand_claims_status=brand_page_quote
- SE-US-020：24项；https://www.cerave.com/skincare/facial-serums/hydrating-hyaluronic-acid-serum；brand_claims_status=retail_mismatch
4. 品牌宣称：上列为原稿状态。原稿的version_mismatch行仍保留了品牌引文，违反当前模板，须清空或重核；claim_source也须改为data_classification。本轮附表不代替这些修订。
5. 价格与规格：本轮购买附表不含价格，未整体刷新产品表价格。listed只表示商品页列出。旧稿容量取整、促销价及规格映射仍须核对，重量不换算ml。
6. 覆盖表：以下按旧稿品牌定位、累计预算统计，未排除none及版本待核产品，不能作为验收通过覆盖。

|困扰|≤$15|≤$30|≤$60|不限|
|---|---|---|---|---|
|acne|1（无香1）|1（无香1）|1（无香1）|1（无香1）|
|oil|1（无香0）|2（无香1）|2（无香1）|2（无香1）|
|dryness|4（无香4）|7（无香7）|7（无香7）|7（无香7）|
|redness|2（无香1）|3（无香2）|3（无香2）|3（无香2）|
|pigmentation|6（无香3）|11（无香8）|11（无香8）|11（无香8）|
|aging|3（无香2）|6（无香5）|6（无香5）|8（无香7）|
|pores|3（无香2）|5（无香4）|5（无香4）|5（无香4）|

未达要求：仍未完成品牌/肤质/预算的全部合格覆盖；none产品不能直接计入符合入库要求的覆盖。非致痘或适用痘肌按计划另作适用性覆盖，不自动计为治疗痤疮。
7. 待核对清单：所有none产品需替换或补证；原formula_note全部待核事项保留。MO-002成分数量；MO-005/009/014/019/020版本或来源；SE-005–008旧站版本；SE-013 Drug Facts；SE-014库存和异常拼写；SE-017–020版本与来源问题。评分是产品/系列页面汇总，不能与单一配方等同。
8. 未完成的部分：榜单第2、3页读取失败；不以品牌筛选页、Sponsored、推荐轮播充当畅销主榜。评分读不到即留空。未完成40款产品主表的格式清理；未完成SE第2批、EX20及ST15；没有将候选稿计为验收通过。
