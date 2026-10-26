# su_batch3 自查报告

核对日期：2026-10-26。产品主表为固定50列，未知字段留空或unknown，单一成分来源，不拼接配方。

## 1. 数量与编号

10款；SU-US-041–SU-US-050，编号连续且唯一。与第一批/前两批产品名称核对；替换沿用原编号，未同时保留旧候选。

## 2. 表头

products：50列，逐字逐序与data_template.md一致。purchase_links：6列；retail_ratings：9列。platform在原枚举上只增加walmart、kohls。品牌图片等无开放授权字段全部留空。

## 3. 成分表

以下项数按分号分隔。条件色素/May contain保留条件；括号里的逗号、1,2-Hexanediol、2-Oleamido-1,3-Octadecanediol不拆分。成分顺序基于所列单一披露源，不声称已逐支取得实物包装。

- SU-US-041：36项；https://kosas.com/pages/dreambeam
- SU-US-042：29项；https://www.kohls.com/product/prd-6706661/kiehls-since-1851-better-screen-uv-serum-spf-50-facial-sunscreen-with-collagen-peptide.jsp
- SU-US-043：30项；https://dailymed.nlm.nih.gov/dailymed/getFile.cfm?setid=84fbbb01-bb16-41a6-a53a-6e85d515ca2c&type=pdf
- SU-US-044：55项；https://www.peterthomasroth.com/products/water-drench-broad-spectrum-spf-45-hyaluronic-cloud-moisturizer-1901008
- SU-US-045：42项；https://tula.com/products/protect-and-glow
- SU-US-046：48项；https://www.shiseido.com/us/en/urban-environment-oil-control-sunscreen-spf-40-0730852202993.html
- SU-US-047：24项；https://www.cetaphil.com/us/products/product-categories/all-moisturizers/redness-relieving-daily-facial-tinted-moisturizer-spf-40/302995889005.html
- SU-US-048：44项；https://usa.erborian.com/cc-red-correct---color-correcting-cream-6AA10670.html
- SU-US-049：40项；https://eadem.co/products/sunsuede-daily-sunscreen-and-blurring-primer
- SU-US-050：30项；https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=2e6eac42-0b70-44ea-e063-6294a90a49f8

## 4. 品牌宣称

映射只用品牌产品页的文案；1–3项定位。brand_claims与brand_claims_quote一致。无香yes须有品牌明确声明及链接，不从INCI推断。已读到品牌文案但未完整展开官网INCI的产品，其同版核验限制在第7项逐款列明，不把它们描述成全部配方已核验。

- SU-US-041：brand_page_quote；pigmentation;dryness；https://kosas.com/pages/dreambeam
- SU-US-042：brand_page_quote；pigmentation;aging；https://www.kiehls.com/skincare/facial-sunscreens/better-screen%E2%84%A2-uv-serum-spf-50-facial-sunscreen-with-collagen-peptide/WW0269KIE.html
- SU-US-043：brand_page_quote；pigmentation;aging;dryness；https://www.itcosmetics.com/makeup/face-makeup/sunscreen-and-spf/hello-sunshine-invisible-sunscreen-for-face-spf-50/ITC_1229.html
- SU-US-044：brand_page_quote；dryness;aging；https://www.peterthomasroth.com/products/water-drench-broad-spectrum-spf-45-hyaluronic-cloud-moisturizer-1901008
- SU-US-045：brand_page_quote；dryness;redness；https://tula.com/products/protect-and-glow
- SU-US-046：brand_page_quote；oil;dryness；https://www.shiseido.com/us/en/urban-environment-oil-control-sunscreen-spf-40-9990000000214.html
- SU-US-047：brand_page_quote；redness;dryness；https://www.cetaphil.com/us/products/product-categories/all-moisturizers/redness-relieving-daily-facial-tinted-moisturizer-spf-40/302995889005.html
- SU-US-048：brand_page_quote；redness；https://usa.erborian.com/cc-red-correct---color-correcting-cream-6AA10670.html
- SU-US-049：brand_page_quote；pores;oil；https://eadem.co/products/sunsuede-daily-sunscreen-and-blurring-primer
- SU-US-050：brand_page_quote；pores；https://www.meritbeauty.com/products/the-uniform-spf-45

## 5. 价格与规格

一次性单支常规价格，排除促销和订阅价。只在有明确mL或fl oz时填体积；Differin等净重不换算mL。多规格评价是产品总体值，不声称是参考SKU独占。未把Sephora的K缩略计数写成精确整数。

- SU-US-041：$40；40 mL；购买参考页 https://www.sephora.com/product/dreambeam-moisturizing-mineral-sunscreen-spf-40-with-ceramides-and-peptides-P505327?skuId=2761633
- SU-US-042：$69；100 mL；购买参考页 https://www.sephora.com/product/kiehls-better-screen-tm-uv-serum-spf-50-facial-sunscreen-with-collagen-peptide-P509517?skuId=2880805
- SU-US-043：$36；50 mL；购买参考页 https://www.sephora.com/product/it-cosmetics-hello-sunshine-spf-P510412/
- SU-US-044：$55；50 mL；购买参考页 https://www.sephora.com/product/peter-thomas-roth-water-drench-hyaluronic-hydrating-moisturizer-spf-45-P458576?skuId=2354629
- SU-US-045：$58；100 mL；购买参考页 https://www.ulta.com/p/protect-glow-daily-sunscreen-gel-broad-spectrum-spf-30-pimprod2016249
- SU-US-046：$52；50 mL；购买参考页 https://www.sephora.com/product/shiseido-urban-environment-oil-free-sunscreen-broad-spectrum-spf-42-P474390
- SU-US-047：$15.94；50 mL；购买参考页 https://www.walmart.com/ip/181312877
- SU-US-048：$26.00；15 mL；购买参考页 https://www.ulta.com/p/cc-red-correct-green-color-corrector-spf25-pimprod2005691?sku=2572682
- SU-US-049：$32；净重/未核实，不换算 mL；购买参考页 https://www.sephora.com/product/sunsuede-spf-50-lightweight-sunscreen-blurring-primer-stick-P522181?skuId=2973014
- SU-US-050：$38；50 mL；购买参考页 https://www.kohls.com/product/prd-7562699/merit-the-uniform-tinted-mineral-sunscreen-broad-spectrum-spf-45.jsp

## 6. 覆盖表

困扰 | ≤$15 | ≤$30 | ≤$60 | 不限 | 明确无香
--- | ---: | ---: | ---: | ---: | ---:
acne | 0 | 0 | 0 | 0 | 0
oil | 0 | 0 | 2 | 2 | 0
dryness | 0 | 1 | 6 | 6 | 2
redness | 0 | 2 | 3 | 3 | 1
pigmentation | 0 | 0 | 2 | 3 | 2
aging | 0 | 0 | 2 | 3 | 1
pores | 0 | 0 | 2 | 2 | 0

≤$15：0；>$50：4；明确无香：3。

## 7. 逐款版本与待核对事项

- SU-US-041：DreamBeam Sunlit golden-glow shade; 1.3 oz / 40 mL; tinted mineral sunscreen; iron oxides disclosed in official INCI.；Drug Facts: reapply after 80 minutes of swimming or sweating；https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f93b0091-6a41-ae6e-e053-6394a90a86d7
- SU-US-042：Value size 3.4 fl oz / 100 mL selected for this row; Sephora direct product page shows $69 and 2.2K reviews.；完整成分仅取Kohl’s单一页面，活性浓度同页披露；Drug Facts无防水声明；https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=48980ef3-ebda-450e-9f15-effad27dec9a；Kohl’s默认50mL不是本记录100mL价格SKU，未套用其$45价格。
- SU-US-043：1.7 oz / 50 mL US Sephora SKU 2773372.；单一美国化学防晒Drug Facts（NDC49967-886），未混用同名矿物版；无防水声明，标签要求游泳时另用防水防晒。
- SU-US-044：1.7 oz / 50 mL; Sephora SKU 2354629.；无40/80分钟防水声明；品牌当前用法及零售包装Drug Facts复核，标none；品牌网页2026成分排序与原记录不同，原已验收配方保留，不将新版成分拼入。
- SU-US-045：Supersize 3.38 oz / ~100 mL selected; Ulta direct product page lists $58 and 3,403 reviews.
- SU-US-046：50 mL size; official US brand page in stock at $52; distinct from SU-US-020 Ultimate Sun Protector Lotion SPF 60+.
- SU-US-047：Neutral tint; 1.7 fl oz / 50 mL; redness-prone sensitive skin; Walmart one-time price observed $15.94 (regular $17.99).
- SU-US-048：美国SPF25配方；Ulta 2572682，0.5oz/15mL，常规单支$26，未用促销$18.20；完整INCI仅品牌美国页；SPF/broad spectrum/无防水声明据美国Drug Facts：https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=a6cd16cc-5fe3-41b5-b724-83e469cd4d5e；不采用英国新版SPF30。Amazon仅评分依据，未作为已核品牌官方卖家的购买链接。
- SU-US-049：0.7 oz / 20 g; net weight only, size_ml left blank; Korean-made chemical sunscreen stick.
- SU-US-050：50 mL; tinted mineral sunscreen; 20-shade range. DailyMed US label used for full INCI and active concentration.

## 8. 未完成与限制

本次要求的042完整INCI/活性浓度、048替换、041–044防水字段均已填入。防水值依次为80/none/none/none。048替换为Erborian mini，美国SPF25、broad_spectrum=yes，$26，直接Amazon商品页2,837条。

通用“6款≤$15”仍未满足（0款）；原已验收8款保持，未为凑低价更换。044当前品牌网页成分与旧验收稿不同，旧单一配方保留，包装版仍须确认；不能声称本批所有零售包装版本都已通过验证。原其余8款入库依据为前次已核记录，本次未重做全部评分普查。
