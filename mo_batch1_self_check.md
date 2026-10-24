# MO 第1批补核自查（2026-10-24）

1. 数量与编号：入库依据、购买链接、评分表各20行；ID连续唯一，引用已有ID，不新增产品。有效入库依据5行；其余none仅表示本轮未核到，不代表产品不在所有榜单。
2. 表头：inclusion为用户指定2列；purchase_links为模板6列；retail_ratings为模板9列。原products仍为50列，本轮没有声称已修完原产品表。
3. 成分表：本轮未重新核实配方；以下为已有稿的单源记录及分号项数，不是本轮确认成分正确。未把1,2-Hexanediol按逗号拆分。
- MO-US-001：19项；https://www.vanicream.com/product/vanicream-daily-facial-moisturizer；brand_claims_status=brand_page_quote
- MO-US-002：10项；https://www.vanicream.com/product/vanicream-moisturizing-cream；brand_claims_status=brand_page_quote
- MO-US-003：24项；https://www.cerave.com/skincare/moisturizers/pm-facial-moisturizing-lotion；brand_claims_status=brand_page_quote
- MO-US-004：24项；https://www.cerave.com/skincare/moisturizers/moisturizing-cream；brand_claims_status=brand_page_quote
- MO-US-005：25项；https://www.cerave.com/skincare/moisturizers/daily-moisturizing-lotion；brand_claims_status=brand_page_quote
- MO-US-006：18项；https://www.laroche-posay.us/our-products/face/face-moisturizer/toleriane-double-repair-face-moisturizer-3337875545792.html；brand_claims_status=brand_page_quote
- MO-US-007：20项；https://www.laroche-posay.us/our-products/face/face-moisturizer/toleriane-dermallergo-moisturizing-cream-3337872412486.html；brand_claims_status=brand_page_quote
- MO-US-008：16项；https://www.cetaphil.com/us/products/product-categories/all-moisturizers/daily-hydrating-lotion/302993889038.html；brand_claims_status=brand_page_quote
- MO-US-009：16项；https://www.target.com/p/-/A-83470774；brand_claims_status=brand_page_quote
- MO-US-010：46项；https://theordinary.com/en-us/natural-moisturizing-factors-ha-moisturizer-100435.html；brand_claims_status=brand_page_quote
- MO-US-011：47项；https://skinfix.com/products/lipid-peptide-cream；brand_claims_status=brand_page_quote
- MO-US-012：22项；https://skinfix.com/products/balancing-cleanse-moisturize；brand_claims_status=brand_page_quote
- MO-US-013：47项；https://tatcha.com/products/the-dewy-skin-cream；brand_claims_status=brand_page_quote
- MO-US-014：37项；https://store.skincarelab.com/triple-lipid-restore-2---4---2.html；brand_claims_status=brand_page_quote
- MO-US-015：43项；https://m.cremedelamer.com/product/5834/12343/face/moisturizers/creme-de-la-mer；brand_claims_status=brand_page_quote
- MO-US-016：42项；https://www.clinique.com/products/moisture-surge-100h-auto-replenishing-hydrator；brand_claims_status=brand_page_quote
- MO-US-017：22项；https://www.aveeno.com/products/calm-restore-oat-gel-moisturizer-sensitive-skin；brand_claims_status=brand_page_quote
- MO-US-018：33项；https://www.cetaphil.com/us/products/product-categories/all-moisturizers/rich-hydrating-cream/302993889021.html；brand_claims_status=brand_page_quote
- MO-US-019：39项；https://www.ulta.com/p/hydro-boost-hyaluronic-acid-water-cream-fragrance-free-pimprod2041040?sku=2615560；brand_claims_status=brand_page_quote
- MO-US-020：25项；https://www.ulta.com/p/radiant-tone-night-cream-dark-spot-corrector-pimprod2049164?sku=2634617；brand_claims_status=brand_page_quote
4. 品牌宣称：上列为原稿状态。原稿的version_mismatch行仍保留了品牌引文，违反当前模板，须清空或重核；claim_source也须改为data_classification。本轮附表不代替这些修订。
5. 价格与规格：本轮购买附表不含价格，未整体刷新产品表价格。listed只表示商品页列出。旧稿容量取整、促销价及规格映射仍须核对，重量不换算ml。
6. 覆盖表：以下按旧稿品牌定位、累计预算统计，未排除none及版本待核产品，不能作为验收通过覆盖。

|困扰|≤$15|≤$30|≤$60|不限|
|---|---|---|---|---|
|acne|0（无香0）|0（无香0）|0（无香0）|0（无香0）|
|oil|0（无香0）|0（无香0）|1（无香1）|1（无香1）|
|dryness|7（无香6）|11（无香10）|16（无香15）|19（无香15）|
|redness|1（无香1）|1（无香1）|1（无香1）|2（无香1）|
|pigmentation|0（无香0）|0（无香0）|1（无香0）|1（无香0）|
|aging|0（无香0）|0（无香0）|0（无香0）|3（无香0）|
|pores|0（无香0）|0（无香0）|1（无香1）|2（无香1）|

未达要求：仍未完成品牌/肤质/预算的全部合格覆盖；none产品不能直接计入符合入库要求的覆盖。非致痘或适用痘肌按计划另作适用性覆盖，不自动计为治疗痤疮。
7. 待核对清单：所有none产品需替换或补证；原formula_note全部待核事项保留。MO-002成分数量；MO-005/009/014/019/020版本或来源；SE-005–008旧站版本；SE-013 Drug Facts；SE-014库存和异常拼写；SE-017–020版本与来源问题。评分是产品/系列页面汇总，不能与单一配方等同。
8. 未完成的部分：榜单第2、3页读取失败；不以品牌筛选页、Sponsored、推荐轮播充当畅销主榜。评分读不到即留空。未完成40款产品主表的格式清理；未完成SE第2批、EX20及ST15；没有将候选稿计为验收通过。
