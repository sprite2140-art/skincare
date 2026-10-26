# se_batch2 自查报告

核对日期：2026-10-26。产品主表为固定50列，未知字段留空或unknown，单一成分来源，不拼接配方。

## 1. 数量与编号

20款；SE-US-021–SE-US-040，编号连续且唯一。与第一批/前两批产品名称核对；替换沿用原编号，未同时保留旧候选。

## 2. 表头

products：50列，逐字逐序与data_template.md一致。purchase_links：6列；retail_ratings：9列。platform在原枚举上只增加walmart、kohls。品牌图片等无开放授权字段全部留空。

## 3. 成分表

以下项数按分号分隔。条件色素/May contain保留条件；括号里的逗号、1,2-Hexanediol、2-Oleamido-1,3-Octadecanediol不拆分。成分顺序基于所列单一披露源，不声称已逐支取得实物包装。

- SE-US-021：9项；https://www.ulta.com/p/adapalene-01-acne-treatment-gel-xlsImpprod15791005
- SE-US-022：21项；https://www.sephora.com/product/paula-s-choice-10-azelaic-acid-booster-P469507
- SE-US-023：21项；https://www.laroche-posay.us/our-products/face/acne-products/effaclar-salicylic-acid-acne-treatment-serum-3337875722827.html
- SE-US-024：31项；https://www.peachandlily.com/products/redness-relief-azelaic-acid-serum
- SE-US-025：23项；https://www.elfcosmetics.com/products/holy-hydration-thirst-burst-drops
- SE-US-026：14项；https://www.elfcosmetics.com/products/holy-hydration-triple-bounce-serum
- SE-US-027：29项；https://www.laroche-posay.us/our-products/face/face-serum/vitamin-c12-serum-3337875660570.html
- SE-US-028：22项；https://www.laroche-posay.us/our-products/face/face-serum/retinol-b3-pure-retinol-serum-3337875694469.html
- SE-US-029：43项；https://www.ulta.com/p/advanced-night-repair-multi-recovery-complex-serum-with-hyaluronic-acid-peptides-pimprod2016818
- SE-US-030：52项；https://www.clinique.com/products/clinique-smart-clinical-repair-wrinkle-correcting-serum
- SE-US-031：30项；https://www.peachandlily.com/products/super-fade-discoloration-serum
- SE-US-032：28项；https://www.sephora.com/product/genifique-ultimate-serum-P515030
- SE-US-033：23项；https://www.peachandlily.com/products/glass-skin-refining-serum
- SE-US-034：34项；https://www.cocokind.com/products/ceramide-barrier-serum
- SE-US-035：12项；https://www.ulta.com/p/advanced-snail-96-mucin-power-essence-xlsImpprod15641052?sku=2577440
- SE-US-036：51项；https://anua.com/products/niacinamide-10-txa-4-serum-2
- SE-US-037：28项；https://www.ulta.com/p/hydrating-serum-with-tri-ceramide-complex-pimprod2059308
- SE-US-038：32项；https://www.dermalogica.com/products/biolumin-c-serum
- SE-US-039：27项；https://www.ulta.com/p/ceo-15-vitamin-c-brightening-serum-pimprod2007847
- SE-US-040：24项；https://www.cerave.com/skincare/acne/acne-control-gel

## 4. 品牌宣称

映射只用品牌产品页的文案；1–3项定位。brand_claims与brand_claims_quote一致。无香yes须有品牌明确声明及链接，不从INCI推断。已读到品牌文案但未完整展开官网INCI的产品，其同版核验限制在第7项逐款列明，不把它们描述成全部配方已核验。

- SE-US-021：brand_page_quote；acne;pores；https://differin.com/shop/differin-gel/3029949.html
- SE-US-022：brand_page_quote；pigmentation;redness;acne；https://www.paulaschoice.co.uk/aa-booster/m7750.html
- SE-US-023：brand_page_quote；acne;pores;pigmentation；https://www.laroche-posay.us/our-products/face/acne-products/effaclar-salicylic-acid-acne-treatment-serum-3337875722827.html
- SE-US-024：brand_page_quote；redness;acne；https://www.peachandlily.com/products/redness-relief-azelaic-acid-serum
- SE-US-025：brand_page_quote；dryness;pigmentation；https://www.elfcosmetics.com/products/holy-hydration-thirst-burst-drops
- SE-US-026：brand_page_quote；dryness;pores;pigmentation；https://www.elfcosmetics.com/products/holy-hydration-triple-bounce-serum
- SE-US-027：retail_mismatch；aging;pigmentation；https://www.laroche-posay.us/our-products/face/face-serum/vitamin-c12-serum-3337875660570.html
- SE-US-028：brand_page_quote；aging；https://www.laroche-posay.us/our-products/face/face-serum/retinol-b3-pure-retinol-serum-3337875694469.html
- SE-US-029：not_collected；未采集；
- SE-US-030：retail_mismatch；aging;dryness；https://www.clinique.com/products/clinique-smart-clinical-repair-wrinkle-correcting-serum
- SE-US-031：brand_page_quote；pigmentation;redness；https://www.peachandlily.com/products/super-fade-discoloration-serum
- SE-US-032：brand_page_quote；redness;dryness;aging；https://www.lancome-usa.com/skincare/face-serum/genifique-ultimate-recovery-serum/3614274299014.html
- SE-US-033：brand_page_quote；redness;pigmentation;dryness；https://www.peachandlily.com/products/glass-skin-refining-serum
- SE-US-034：retail_mismatch；dryness;redness；https://www.cocokind.com/products/ceramide-barrier-serum
- SE-US-035：not_collected；未采集；
- SE-US-036：brand_page_quote；pigmentation;pores;dryness；https://anua.com/products/niacinamide-10-txa-4-serum-2
- SE-US-037：not_collected；未采集；
- SE-US-038：retail_mismatch；pigmentation;aging；https://www.dermalogica.com/products/biolumin-c-serum
- SE-US-039：not_collected；未采集；
- SE-US-040：brand_page_quote；acne;pores;dryness；https://www.cerave.com/skincare/acne/acne-control-gel

## 5. 价格与规格

一次性单支常规价格，排除促销和订阅价。只在有明确mL或fl oz时填体积；Differin等净重不换算mL。多规格评价是产品总体值，不声称是参考SKU独占。未把Sephora的K缩略计数写成精确整数。

- SE-US-021：$13.49；净重/未核实，不换算 mL；购买参考页 https://www.target.com/p/-/A-51346324
- SE-US-022：$42.00；30 mL；购买参考页 https://www.sephora.com/product/paula-s-choice-10-azelaic-acid-booster-P469507
- SE-US-023：$44.99；30 mL；购买参考页 https://www.ulta.com/p/effaclar-face-serum-with-salicylic-acid-pimprod2033423?sku=2597368
- SE-US-024：$19.99；30 mL；购买参考页 https://www.ulta.com/p/redness-relief-azelaic-acid-serum-pimprod2033306?sku=2597522
- SE-US-025：$13.00；30 mL；购买参考页 https://www.ulta.com/p/holy-hydration-thirst-burst-drops-dewy-brightening-pimprod2049550?sku=2631986
- SE-US-026：$13.00；30 mL；购买参考页 https://www.ulta.com/p/holy-hydration-triple-bounce-serum-pimprod2036595?sku=2605492
- SE-US-027：$46.99；30 mL；购买参考页 https://www.ulta.com/p/pure-12-vitamin-c-serum-wrinkle-reduction-radiance-pimprod2012322?sku=2556946
- SE-US-028：$46.99；30 mL；购买参考页 https://www.ulta.com/p/retinol-b3-face-serum-fine-lines-wrinkles-pimprod2013151?sku=2559628
- SE-US-029：$88.00；30 mL；购买参考页 https://www.ulta.com/p/advanced-night-repair-multi-recovery-complex-serum-with-hyaluronic-acid-peptides-pimprod2016818?sku=2568523
- SE-US-030：$80.00；30 mL；购买参考页 https://www.ulta.com/p/clinique-smart-clinical-repair-wrinkle-correcting-serum-pimprod2025268?sku=2582928
- SE-US-031：$11.99；30 mL；购买参考页 https://www.ulta.com/p/super-fade-discoloration-serum-pimprod2049581?sku=2634854
- SE-US-032：$135.00；50 mL；购买参考页 https://www.sephora.com/product/genifique-ultimate-serum-P515030
- SE-US-033：$39.00；40 mL；购买参考页 https://www.ulta.com/p/glass-skin-refining-serum-xlsImpprod18971035?sku=2532640
- SE-US-034：$21.99；30 mL；购买参考页 https://www.ulta.com/p/ceramide-barrier-nourishing-daily-serum-pimprod2032101?sku=2596547
- SE-US-035：$7.50；30 mL；购买参考页 https://www.ulta.com/p/advanced-snail-96-mucin-power-essence-xlsImpprod15641052?sku=2577440
- SE-US-036：$11.00；10 mL；购买参考页 https://www.ulta.com/p/niacinamide-10-txa-4-serum-brightening-dark-spots-pimprod2048921?sku=2644104
- SE-US-037：$17.99；30 mL；购买参考页 https://www.ulta.com/p/hydrating-serum-with-tri-ceramide-complex-pimprod2059308?sku=2654922
- SE-US-038：$99.00；30 mL；购买参考页 https://www.ulta.com/p/biolumin-c-vitamin-c-serum-xlsImpprod18521001?sku=2547336
- SE-US-039：$85.00；30 mL；购买参考页 https://www.ulta.com/p/ceo-15-vitamin-c-brightening-serum-pimprod2007847?sku=2550151
- SE-US-040：$15.79；40 mL；购买参考页 https://www.target.com/p/-/A-82403939

## 6. 覆盖表

困扰 | ≤$15 | ≤$30 | ≤$60 | 不限 | 明确无香
--- | ---: | ---: | ---: | ---: | ---:
acne | 1 | 3 | 5 | 5 | 2
oil | 0 | 0 | 0 | 0 | 0
dryness | 3 | 5 | 6 | 8 | 2
redness | 1 | 3 | 5 | 6 | 3
pigmentation | 4 | 4 | 8 | 9 | 3
aging | 0 | 0 | 2 | 5 | 1
pores | 3 | 4 | 5 | 5 | 1

≤$15：6；>$50：5；明确无香：5。

## 7. 逐款版本与待核对事项

- SE-US-021：OTC阿达帕林0.1%，Target 15g/0.5oz常规单支$13.49，非促销$10.79；净重不换算mL；完整活性+非活性成分只取Ulta同一页，Hydrochloric Acid保留May contain条件；Drug Facts据同页。pores为预防毛孔堵塞，不声称缩小孔径。
- SE-US-022：替换原草稿Effaclar Adapalene；美国Sephora 2421329，1oz/30mL $42；INCI仅取美国Sephora。品牌原文与用法取官方英国页，21项配方顺序与美国Sephora对照，水/甘油命名及功能注释不作为配方差异；没有将英国价格或规格移入US记录。美国官网受限。Amazon 6,360为总体评价。
- SE-US-023：OTC水杨酸；原草稿缺活性，已以品牌美国页单一完整活性+非活性列表重建21项；未补猜Glycolic Acid/LHA浓度；Ulta畅销主列表第2页。
- SE-US-024：美国30mL，Ulta 2597522，$19.99；31项品牌单一完整INCI与Ulta一致；入库依据为Ulta畅销主列表第2页，411条评价不冒称达1000。acne对应品牌breakouts/blemishes定位。
- SE-US-025：Ulta 2631986，1fl oz，$13；完整INCI取品牌官网公开内嵌产品数据，与Ulta同序。1% hydrating hibiscus complex为复配，仅记录于key_actives/formula_note，不分配各INCI浓度。官网公开内嵌产品数据完整INCI已提取并与Ulta核对。
- SE-US-026：Ulta 2605492；1oz/30mL；常规$13，不用促销$12。1.7% Hyaluronic Acid为不同分子量总量，INCI含Hydrolyzed Sodium Hyaluronate及Sodium Hyaluronate，不把总量重复分配；官网公开内嵌产品数据完整INCI已提取并与Ulta核对。pigmentation对应官网even out skin tone。
- SE-US-027：采用品牌美国官网C12完整29项配方，去除网页排版造成的字内空格；Ulta仍列另一配方（Dimethicone位居前列、无Cyclohexasiloxane等），标retail_mismatch；参考Ulta $46.99 30mL，零售所发版本[待核对]。
- SE-US-028：美国Retinol B3，22项品牌完整INCI与Ulta对应；品牌未在本次读到页面明确单一Retinol浓度，active_concentrations留空；Ulta畅销主列表第1页，不以776条评价冒充1000。
- SE-US-029：Ulta 2568523，1oz/30mL $88；43项INCI仅取Ulta。官网品牌原文已采集，官网未展开完整INCI，同版全配方一致性[待核对]。；品牌文案与本条完整配方的同版核验未完成，相关品牌宣称字段清空；未收录为已核品牌宣称。
- SE-US-030：品牌当前ILN99116完整52项INCI；Ulta多列Acetyl Glucosamine，不能合并，采用品牌单一版本并标retail_mismatch。9.5% peptides、1% advanced retinoid是品牌复配描述，不视为单一INCI浓度；Ulta 2582928 1oz $80，所发配方[待核对]。
- SE-US-031：替换草稿Clarins，Ulta 2634854 单支1.01oz/30mL $11.99；30项完整INCI同序。官网同页出现4.5% Cetyl Tranexamate Mesylate，而Ulta写3.5%该成分/4.5% Niacinamide，存在浓度文案冲突，active_concentrations均留空；不把衍生物记成Tranexamic Acid。
- SE-US-032：已排除原Ulta草稿的旧Advanced Génifique 24项配方；仅用美国Sephora当前Ultimate含Beta-Glucan的28项配方，对应品牌新版宣称；选择Sephora默认2831691，1.69oz/50mL $135，不能沿用旧草稿$89/30mL。3.4K仅原显示，不造精确3400。
- SE-US-033：Ulta 2532640，1.35oz/40mL $39；品牌单一完整23项INCI；品牌配方中烟酰胺未取得明确浓度，不估算。；本次品牌正文未取得明确无香声明，顾客评论不作品牌证据，无香留unknown。
- SE-US-034：采用官网Updated Formula完整34项；去除了原草稿中的banana extract及lactic acid旧版，未拼接。官网当前$22/30mL，Ulta参考同规格$21.99但仍列旧配方，标retail_mismatch，所发版本[待核对]。4.10% hero ingredients等为复配总量不写单一浓度。*为有机认证脚注。
- SE-US-035：替换草稿SKIN1004；Ulta 2577440，1.01oz/30mL，常规单支$7.50，非促销$5.25；12项INCI只取Ulta单页，品牌官网完整顺序未展开，官网与零售全配方一致性[待核对]；不将品牌96%与96.3%的不同文案强行统一为精确浓度。；品牌文案与本条完整配方的同版核验未完成，相关品牌宣称字段清空；未收录为已核品牌宣称。
- SE-US-036：美国Ulta mini 2644104，0.33oz/10mL $11，不套用官网大瓶$28；完整51项INCI与官网当前列表同序；10mL据迷你规格标签；2%只对应Arbutin，不分配给另列Alpha-Arbutin；Ulta畅销主列表第1页。
- SE-US-037：Ulta 30mL $17.99；完整INCI按Ulta单一顺序，移除其附加的Carrier/Humectants等功能注释，未把官网按功能分组列表拼成包装顺序。品牌官网目前sold out、Ulta可售；三神经酰胺复配不写单体浓度。官网同版顺序未完整展开[待核对]。；品牌文案与本条完整配方的同版核验未完成，相关品牌宣称字段清空；未收录为已核品牌宣称。
- SE-US-038：Ulta 2532250 1oz/30mL $99；采用官网完整32项INCI。官网Salvia Hispanica Seed Oil与Ulta Seed Extract不同，标retail_mismatch，参考零售所发版本[待核对]。未公开维C单体百分比，不估算。
- SE-US-039：Ulta 2550151 1oz/30mL $85；完整27项INCI仅取Ulta；官网为功用分组而非完整顺序，不拼接；官网与零售完整配方一致性[待核对]。Fragrance-Free为品牌明确宣称，虽列精油仍不由INCI反推no。官网显示缺货，Ulta可售。pores对应官网diminishes the appearance of pores。；品牌文案与本条完整配方的同版核验未完成，相关品牌宣称字段清空；未收录为已核品牌宣称。
- SE-US-040：替换未达入库门槛的AcneFree；美国Target 82403939，1.35fl oz/40mL单支$15.79（页面New lower price，不用旧$17.89）；完整活性+非活性成分仅取品牌美国页24项；Free of Added Fragrance未按严格fragrance-free口径填yes，保留unknown。

## 8. 未完成与限制

20款均有直接零售商PDP计数或实际读取的Ulta畅销主列表页依据，未采用品牌自称Bestseller、第三方评价转述、收藏数、推荐轮播。acne≥5、redness≥3、新品牌≥6、>$50≥4、≤$15≥6按当前选定SKU统计。明确无香仅5款，未满足≥6，未用顾客评论或从INCI推断补足。

**未完成严格同版品牌宣称核验：029、035、037、039。**这四条保留完整零售商单一INCI、价格和直接入库依据；brand_claims_status=not_collected，brand_claims/quote/targets/claimed_benefits及相关未核声明清空。品牌页面完整配方未展开，公开JSON读取也受限，不把名义同款当作全配方已匹配。025、026已从品牌网页公开内嵌产品数据补到完整成分并与Ulta核对。027、030、034、038按模板允许的retail_mismatch收录品牌单一版本，不混配方；实际零售所发版本仍待包装确认。不能称所有20款均已全部验收。022引用官方英国同配方宣称，美国完整INCI/价格/购买依据取美国零售商；若系统要求只接受美国官方宣称URL，需另补美国官网。

累计001–040主成分覆盖需区分：Tranexamic Acid与Cetyl Tranexamate Mesylate、Azelaic Acid与Potassium Azeloyl Diglycinate。衍生物不改写为原酸，也不将它们浓度互换。累计纯传明酸主打仅2款，未满足≥3；维C主打为4款已核加039待核，不能称5款均完成验收。第1批主表只用于去重与累计计数，未重新核验全部历史来源；累计品牌/成分/困扰计算另见verification.json，不将历史数据视为本次重新验收。
