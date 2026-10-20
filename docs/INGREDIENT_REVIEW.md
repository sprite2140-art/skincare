# 成分核对表

由 `npm run ingredient-review` 生成，请勿手改；数据更新后重新运行。核对结果请记在 data/ingredients.csv（review_status 改为 verified，填写 reviewed_on），再重新生成本表。

只列影响打分的成分：有效成分（针对需求，影响需求匹配和证据强度）、风险成分（影响刺激风险、香味层级、孕期 / 处方药提示和想避开的成分）、螯合剂清单和加香清单上的成分。基础成分不列。
共 88 个，出现在 147 个产品中；其中未核对 88 个。按影响的产品数排序。

核对时请逐项确认：中文名、声称的作用（针对的需求 / 风险标签）、证据等级（A / B / C）、有效浓度与法规限量、来源是否支持这些结论。
"核对结果"栏留给核对人填写：✅ 通过 / ✏️ 需修改（写明改什么）/ ❌ 删除。

| 产品数 | 成分 | 中文名 | 声称的作用 | 影响 | 证据等级 | 有效浓度 / 限量 | 来源 | 状态 | 核对结果 |
|---:|---|---|---|---|---|---|---|---|---|
| 101 | Fragrance | 香精 | 香精 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj) | 未核对 |   |
| 59 | Limonene | 柠檬烯 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 55 | Linalool | 芳樟醇 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 47 | Disodium EDTA | EDTA 二钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CIR：EDTA 及其盐类安全评估（PMID 12396676）](https://pubmed.ncbi.nlm.nih.gov/12396676/)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 37 | Salicylic Acid | 水杨酸 | 针对头皮屑、头皮油 | 需求匹配、证据强度 | B | 去屑 1.8%–3%（美国 OTC）；欧盟洗发类冲洗型 3% | [ecfr.gov](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-358/subpart-H)<br>[aad.org](https://www.aad.org/public/everyday-care/hair-scalp-care/scalp/treat-dandruff)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 34 | Hexyl Cinnamal | 己基肉桂醛 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 31 | Benzyl Alcohol | 苯甲醇 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 29 | Panthenol | 泛醇 | 针对受损、干燥、头皮痒 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 28503966](https://pubmed.ncbi.nlm.nih.gov/28503966/)<br>[PMID 12113650](https://pubmed.ncbi.nlm.nih.gov/12113650/) | 未核对 |   |
| 29 | Sodium Hyaluronate | 透明质酸钠 | 针对干燥 | 需求匹配、证据强度 | B | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 35833366](https://pubmed.ncbi.nlm.nih.gov/35833366/)<br>[PMID 24688623](https://pubmed.ncbi.nlm.nih.gov/24688623/) | 未核对 |   |
| 28 | Isopropyl Alcohol | 异丙醇 | 酒精 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 24 | Sodium Laureth Sulfate | 月桂醇聚醚硫酸酯钠 | 强清洁力表活 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 12641575](https://pubmed.ncbi.nlm.nih.gov/12641575/)<br>[PMID 11278060](https://pubmed.ncbi.nlm.nih.gov/11278060/) | 未核对 |   |
| 23 | Tetrasodium EDTA | EDTA 四钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CIR：EDTA 及其盐类安全评估（PMID 12396676）](https://pubmed.ncbi.nlm.nih.gov/12396676/)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 22 | Ceramide NP | 神经酰胺 NP | 针对干燥、受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 34596254](https://pubmed.ncbi.nlm.nih.gov/34596254/)<br>[PMID 31585489](https://pubmed.ncbi.nlm.nih.gov/31585489/) | 未核对 |   |
| 22 | Niacinamide | 烟酰胺 | 针对出油、泛红敏感、暗沉色斑、毛孔、细纹松弛 | 需求匹配、证据强度 | B | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 34439563](https://pubmed.ncbi.nlm.nih.gov/34439563/)<br>[PMID 18492135](https://pubmed.ncbi.nlm.nih.gov/18492135/) | 未核对 |   |
| 21 | Sodium C14-16 Olefin Sulfonate | C14-16 烯烃磺酸钠 | 强清洁力表活 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 18 | Hydroxycitronellal | 羟基香茅醛 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 15 | Coumarin | 香豆素 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 15 | Menthol | 薄荷醇 | 针对头皮痒 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 27141849](https://pubmed.ncbi.nlm.nih.gov/27141849/) | 未核对 |   |
| 14 | Trisodium Ethylenediamine Disuccinate | 乙二胺二琥珀酸三钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/59889)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 13 | Ceramide AP | 神经酰胺 AP | 针对干燥、受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 13 | Citronellol | 香茅醇 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 12 | Amyl Cinnamal | 戊基肉桂醛 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 12 | Ceramide EOP | 神经酰胺 EOP | 针对干燥、受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 11 | Rosmarinus Officinalis Leaf Oil | 迷迭香叶油 | 针对掉发；精油 | 需求匹配、证据强度；刺激风险；香味层级 | C | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[PMID 25842469](https://pubmed.ncbi.nlm.nih.gov/25842469/) | 未核对 |   |
| 10 | Benzyl Salicylate | 水杨酸苄酯 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 10 | Methylchloroisothiazolinone | 甲基氯异噻唑啉酮 | 致敏成分 | 刺激风险 | — | 欧盟仅允许用于冲洗型产品（与 MI 混合物 0.0015%） | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 10 | Methylisothiazolinone | 甲基异噻唑啉酮 | 致敏成分 | 刺激风险 | — | 欧盟仅允许用于冲洗型产品，0.0015% | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 9 | Biotin | 生物素 | 针对掉发 | 需求匹配、证据强度 | C | — | [PMID 28879195](https://pubmed.ncbi.nlm.nih.gov/28879195/) | 未核对 |   |
| 9 | Citrus Aurantium Peel Oil | 苦橙果皮油 | 精油；香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/100219)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 9 | Tetrasodium Glutamate Diacetate | 谷氨酸二乙酸四钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/84400)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 8 | Benzyl Benzoate | 苯甲酸苄酯 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 8 | Hydrolyzed Keratin | 水解角蛋白 | 针对受损、干枯毛躁 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 8 | Sodium Phytate | 植酸钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/79995)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 8 | TEA-Dodecylbenzenesulfonate | 十二烷基苯磺酸 TEA 盐 | 强清洁力表活 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 7 | Alcohol | 乙醇 | 酒精 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 7 | Caffeine | 咖啡因 | 针对掉发 | 需求匹配、证据强度 | C | — | [PMID 39997270](https://pubmed.ncbi.nlm.nih.gov/39997270/) | 未核对 |   |
| 7 | Geraniol | 香叶醇 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 7 | Hydrolyzed Hyaluronic Acid | 水解透明质酸 | 针对干燥 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 7 | Sodium Lauryl Sulfate | 月桂醇硫酸酯钠 | 强清洁力表活 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 6 | Alpha-Isomethyl Ionone | α-异甲基紫罗兰酮 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 6 | Linalyl Acetate | 乙酸芳樟酯 | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/77311)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 5 | Ceramide NG | 神经酰胺 NG | 针对干燥、受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 5 | Dipotassium Glycyrrhizate | 甘草酸二钾 | 针对头皮痒、头皮发红、泛红敏感 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 40735556](https://pubmed.ncbi.nlm.nih.gov/40735556/)<br>[PMID 30506356](https://pubmed.ncbi.nlm.nih.gov/30506356/) | 未核对 |   |
| 5 | Piroctone Olamine | 吡罗克酮乙醇胺盐 | 针对头皮屑、头皮痒 | 需求匹配、证据强度 | B | 0.5%–1%（冲洗型）；欧盟冲洗型产品 1% | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 18503415](https://pubmed.ncbi.nlm.nih.gov/18503415/)<br>[PMID 10773717](https://pubmed.ncbi.nlm.nih.gov/10773717/) | 未核对 |   |
| 4 | Citrus Limon Peel Oil | 柠檬果皮油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 4 | Hydrolyzed Collagen | 水解胶原 | 针对受损、扁塌 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 4 | Melaleuca Alternifolia Leaf Oil | 互生叶白千层叶油（茶树油） | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 4 | Serenoa Serrulata Fruit Extract | 锯棕榈果提取物 | 针对掉发 | 需求匹配、证据强度 | C | — | [PMID 33313047](https://pubmed.ncbi.nlm.nih.gov/33313047/)<br>[PMID 38021422](https://pubmed.ncbi.nlm.nih.gov/38021422/) | 未核对 |   |
| 3 | Acetyl Tetrapeptide-3 | 乙酰基四肽-3 | 针对掉发 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 33584955](https://pubmed.ncbi.nlm.nih.gov/33584955/) | 未核对 |   |
| 3 | Alcohol Denat. | 变性乙醇 | 酒精 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Citral | 柠檬醛 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | CURCUMA LONGA ROOT EXTRACT | — | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/75441)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Eucalyptus Globulus Leaf Oil | 蓝桉叶油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Mentha Piperita Oil | 辣薄荷油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Menthyl Lactate | 乳酸薄荷酯 | 针对头皮痒 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Phytic Acid | 植酸 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/36555)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Sodium Salicylate | 水杨酸钠 | 针对头皮屑 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | TRISODIUM HEDTA | — | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CIR：EDTA 及其盐类安全评估（PMID 12396676）](https://pubmed.ncbi.nlm.nih.gov/12396676/)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Ammonium Lauryl Sulfate | 月桂醇硫酸酯铵 | 强清洁力表活 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Bis-Aminopropyl Diglycol Dimaleate | 双氨丙基二甘醇二马来酸酯 | 针对受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>⚠️ [仅检索入口](https://pubmed.ncbi.nlm.nih.gov/?term=bis-aminopropyl+diglycol+dimaleate) | 未核对 |   |
| 2 | Ceramide AG | 神经酰胺 AG | 针对干燥、受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | COCOS NUCIFERA WATER | — | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/55635)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Iodopropynyl Butylcarbamate | 碘丙炔醇丁基氨甲酸酯 | 致敏成分 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Ketoconazole | 酮康唑 | 针对头皮屑、头皮痒 | 需求匹配、证据强度 | A | 1%（美国非处方） | [aad.org](https://www.aad.org/public/everyday-care/hair-scalp-care/scalp/treat-dandruff) | 未核对 |   |
| 2 | LAVANDULA OIL/EXTRACT | — | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/100225)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Mentha Arvensis Leaf Oil | 野薄荷叶油 | 精油；香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/57860)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | ROSMARINUS OFFICINALIS LEAF WATER | — | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/59425)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Selenium Sulfide | 二硫化硒 | 针对头皮屑、头皮痒 | 需求匹配、证据强度 | A | 0.6%–1%（美国非处方） | [ecfr.gov](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-358/subpart-H/section-358.710)<br>[aad.org](https://www.aad.org/public/everyday-care/hair-scalp-care/scalp/treat-dandruff) | 未核对 |   |
| 2 | Terpineol | 松油醇 | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/80711)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Abies Sibirica Oil | 西伯利亚冷杉油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Anthemis Nobilis Flower Oil | 罗马洋甘菊花油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Cedrus Atlantica Bark Oil | 北非雪松树皮油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Citrus Aurantium Dulcis Flower Oil | 甜橙花油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Copper Tripeptide-1 | 铜肽-1 | 针对掉发 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>⚠️ [仅检索入口](https://pubmed.ncbi.nlm.nih.gov/?term=GHK-Cu+hair) | 未核对 |   |
| 1 | Cupressus Sempervirens Oil | 地中海柏木油 | 精油；香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/83473)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | EDTA | 乙二胺四乙酸 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CIR：EDTA 及其盐类安全评估（PMID 12396676）](https://pubmed.ncbi.nlm.nih.gov/12396676/)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Illicium Verum Fruit/Seed Oil | 八角茴香果/籽油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Juniperus Communis Fruit Oil | 欧洲刺柏果油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Juniperus Virginiana Oil | 北美圆柏油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Ocimum Basilicum Oil | 罗勒油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Pyrithione Zinc | 吡硫鎓锌 | 针对头皮屑、头皮痒；孕期需注意成分 | 需求匹配、证据强度；孕期 / 处方药提示 | A | 美国 OTC 冲洗型 1%–2%；欧盟禁用（2022 年起） | [ecfr.gov](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-358/subpart-H)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2021/1902/oj)<br>[aad.org](https://www.aad.org/public/everyday-care/hair-scalp-care/scalp/treat-dandruff) | 未核对 |   |
| 1 | sh-Oligopeptide-78 | sh-寡肽-78 | 针对受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Terpinolene | 萜品油烯 | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/41511)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Tetrasodium Iminodisuccinate | 亚氨基二琥珀酸四钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/60284)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Turpentine | 松节油 | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/41521)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Tussilago Farfara Leaf Extract | 款冬叶提取物 | 针对头皮屑、头皮痒 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 40892112](https://pubmed.ncbi.nlm.nih.gov/40892112/) | 未核对 |   |
| 1 | VIOLA ODORATA LEAF EXTRACT | — | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/80615)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Zingiber Officinale Root Oil | 姜根油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |

## 通俗解释待核对

data/ingredient_explanations.csv 中起草、尚未核对的通俗解释共 104 条（卡片上只在 CosIng 成分的说明里显示，标为未核对）。按起草日期从新到旧、再按出现的产品数排序。核对后把 review_status 改为 verified。

| 起草日期 | 产品数 | 成分 | 中文解释 | 英文解释 | 核对结果 |
|---|---:|---|---|---|---|
| 2026-10-17 | 116 | Citric Acid | 柠檬酸，常用来把产品调到偏弱酸性，让头发表面更平顺；也能结合水中的金属离子。 | Citric acid adjusts the product to a mildly acidic pH, which helps the hair surface lie flat; it also binds metal ions in water. |   |
| 2026-10-17 | 79 | Sodium Chloride | 氯化钠，也就是食盐，在洗发水里主要用来让质地变稠。 | Sodium chloride is table salt; in shampoo it is mainly used to thicken the formula. |   |
| 2026-10-17 | 77 | Phenoxyethanol | 苯氧乙醇，常见的防腐剂，用量有法规上限。 | Phenoxyethanol is a common preservative; its concentration is capped by regulation. |   |
| 2026-10-17 | 77 | Sodium Benzoate | 苯甲酸钠，常见的防腐剂，防止产品开封后长细菌和霉菌。 | Sodium benzoate is a common preservative that keeps bacteria and mould from growing after opening. |   |
| 2026-10-17 | 62 | Sodium Hydroxide | 氢氧化钠，少量用来调节酸碱度，在配方中会被中和，不是以强碱形式留在产品里。 | Sodium hydroxide is used in small amounts to adjust pH; it is neutralised in the formula rather than left as a strong alkali. |   |
| 2026-10-17 | 51 | Tocopherol | 生育酚，即维生素 E，主要用来防止配方中的油脂氧化变质。 | Tocopherol is vitamin E, mainly used to keep oils in the formula from going rancid. |   |
| 2026-10-17 | 48 | Cocamidopropyl Betaine | 椰油酰胺丙基甜菜碱，温和的辅助清洁成分，常和其他清洁成分搭配，增加泡沫、降低刺激。 | Cocamidopropyl betaine is a mild co-surfactant used alongside other cleansers to boost foam and reduce harshness. |   |
| 2026-10-17 | 43 | Ethylhexylglycerin | 乙基己基甘油，常和防腐剂一起用，帮助防腐，也有轻微保湿作用。 | Ethylhexylglycerin is used with preservatives to support them and adds mild conditioning. |   |
| 2026-10-17 | 43 | Glycol Distearate | 乙二醇二硬脂酸酯，让洗发水呈现珠光乳白的外观，也让质地更稠。 | Glycol distearate gives shampoo a pearly, opaque look and adds some thickness. |   |
| 2026-10-17 | 42 | Cetearyl Alcohol | 鲸蜡硬脂醇，一种脂肪醇，不是会让头发变干的酒精；让护发素质地顺滑并帮助软化头发。 | Cetearyl alcohol is a fatty alcohol, not a drying alcohol; it makes conditioner creamy and helps soften hair. |   |
| 2026-10-17 | 42 | Potassium Sorbate | 山梨酸钾，常见的防腐剂，食品中也会用到。 | Potassium sorbate is a common preservative, also used in food. |   |
| 2026-10-17 | 34 | Caprylyl Glycol | 辛甘醇，保湿调理成分，也常用来辅助防腐。 | Caprylyl glycol conditions and moisturises, and is often used to support preservatives. |   |
| 2026-10-17 | 34 | Propylene Glycol | 丙二醇，保湿和溶剂成分，帮助溶解其他成分；少数人可能对它敏感。 | Propylene glycol is a humectant and solvent that helps dissolve other ingredients; a few people are sensitive to it. |   |
| 2026-10-17 | 33 | Behentrimonium Chloride | 山嵛基三甲基氯化铵，护发素中常见的调理成分，带正电，能吸附在头发上，减少打结和静电。 | Behentrimonium chloride is a common conditioning agent; its positive charge clings to hair to reduce tangles and static. |   |
| 2026-10-17 | 33 | Carbomer | 卡波姆，增稠剂，让产品形成凝胶或更稠的质地。 | Carbomer is a thickener that gives the product a gel-like or thicker texture. |   |
| 2026-10-17 | 33 | Cetrimonium Chloride | 西曲氯铵，调理和乳化成分，减少静电和打结；也有一定防腐作用。 | Cetrimonium chloride conditions and emulsifies, reducing static and tangles; it also has some preservative action. |   |
| 2026-10-17 | 33 | Guar Hydroxypropyltrimonium Chloride | 瓜儿胶羟丙基三甲基氯化铵，从瓜儿豆来的调理成分，冲洗后留在头发上，让头发更顺、好梳。 | Guar hydroxypropyltrimonium chloride is a guar-derived conditioner that stays on hair after rinsing so it combs more easily. |   |
| 2026-10-17 | 32 | Butylene Glycol | 丁二醇，保湿和溶剂成分，常用来溶解植物提取物。 | Butylene glycol is a humectant and solvent often used to carry plant extracts. |   |
| 2026-10-17 | 31 | Coco-Betaine | 椰油基甜菜碱，来自椰子油的温和辅助清洁成分，增加泡沫。 | Coco-betaine is a mild coconut-derived co-cleanser that boosts foam. |   |
| 2026-10-17 | 30 | Amodimethicone | 氨端聚二甲基硅氧烷，一种硅油，主要吸附在受损部位，让头发顺滑、减少毛躁。 | Amodimethicone is a silicone that clings mainly to damaged areas, smoothing hair and reducing frizz. |   |
| 2026-10-17 | 28 | Propanediol | 丙二醇（1,3-丙二醇），保湿和溶剂成分，常由玉米发酵制得。 | Propanediol is a humectant and solvent, often made by fermenting corn. |   |
| 2026-10-17 | 26 | Polyquaternium-7 | 聚季铵盐-7，调理成分，在头发表面成膜，减少静电。 | Polyquaternium-7 is a conditioning polymer that forms a film on hair and reduces static. |   |
| 2026-10-17 | 25 | Polyquaternium-10 | 聚季铵盐-10，调理成分，冲洗后在头发表面形成薄膜，减少静电、让头发好梳理。 | Polyquaternium-10 leaves a light film after rinsing that reduces static and makes hair easier to comb. |   |
| 2026-10-17 | 24 | Benzoic Acid | 苯甲酸，防腐剂，也可以调节酸碱度。 | Benzoic acid is a preservative that also adjusts pH. |   |
| 2026-10-17 | 24 | Sodium Cocoyl Isethionate | 椰油酰羟乙磺酸钠，来自椰子油的温和清洁成分，泡沫细腻。 | Sodium cocoyl isethionate is a mild coconut-derived cleanser with a creamy lather. |   |
| 2026-10-17 | 23 | Dimethicone | 聚二甲基硅氧烷，最常见的硅油，在头发表面形成薄膜，让头发顺滑有光泽；用得多可能让细软发显得扁塌。 | Dimethicone is the most common silicone; it coats hair for slip and shine, and heavy use may weigh fine hair down. |   |
| 2026-10-17 | 23 | Sodium Methyl Cocoyl Taurate | 甲基椰油酰基牛磺酸钠，温和的清洁成分，泡沫丰富。 | Sodium methyl cocoyl taurate is a mild, good-lathering cleanser. |   |
| 2026-10-17 | 21 | Aloe Barbadensis Leaf Juice | 芦荟叶汁，常作为舒缓保湿的植物成分加入。 | Aloe leaf juice is a plant ingredient added for a soothing, moisturising feel. |   |
| 2026-10-17 | 20 | Decyl Glucoside | 癸基葡糖苷，来自糖和脂肪醇的温和清洁成分。 | Decyl glucoside is a mild cleanser made from sugar and fatty alcohol. |   |
| 2026-10-17 | 20 | Xanthan Gum | 黄原胶，由发酵得到的天然增稠剂。 | Xanthan gum is a natural thickener made by fermentation. |   |
| 2026-10-17 | 19 | Trideceth-6 | 十三烷醇聚醚-6，乳化和辅助清洁成分，帮助油性成分分散在水里。 | Trideceth-6 is an emulsifier and co-cleanser that helps oily ingredients disperse in water. |   |
| 2026-10-17 | 18 | Hexylene Glycol | 己二醇，溶剂成分，帮助其他成分溶解和分散。 | Hexylene glycol is a solvent that helps other ingredients dissolve and spread. |   |
| 2026-10-17 | 17 | Acrylates Copolymer | 丙烯酸（酯）类共聚物，成膜和增稠成分，也用来让颗粒悬浮。 | Acrylates copolymer forms films, thickens, and keeps particles suspended. |   |
| 2026-10-17 | 17 | Cocamide MIPA | 椰油酰胺 MIPA，增加泡沫、让洗发水变稠。 | Cocamide MIPA boosts foam and thickens shampoo. |   |
| 2026-10-17 | 17 | Sodium Citrate | 柠檬酸钠，和柠檬酸一起调节酸碱度，也能结合水中的金属离子。 | Sodium citrate works with citric acid to buffer pH and also binds metal ions in water. |   |
| 2026-10-17 | 16 | Cocamidopropyl Hydroxysultaine | 椰油酰胺丙基羟磺基甜菜碱，温和的辅助清洁成分，增加泡沫。 | Cocamidopropyl hydroxysultaine is a mild co-cleanser that boosts foam. |   |
| 2026-10-17 | 16 | Sodium Lauroyl Sarcosinate | 月桂酰肌氨酸钠，氨基酸类清洁成分，通常比硫酸盐类温和。 | Sodium lauroyl sarcosinate is an amino-acid-based cleanser, usually milder than sulfates. |   |
| 2026-10-17 | 15 | Arginine | 精氨酸，一种氨基酸，用于调理头发，也可调节酸碱度。 | Arginine is an amino acid used to condition hair and adjust pH. |   |
| 2026-10-17 | 15 | Chlorphenesin | 氯苯甘醚，防腐剂，用量有法规上限。 | Chlorphenesin is a preservative with a regulated maximum concentration. |   |
| 2026-10-17 | 15 | Cocos Nucifera Oil | 椰子油，润泽头发，能减少洗发时头发吸水膨胀。 | Coconut oil conditions hair and can reduce swelling from water during washing. |   |
| 2026-10-17 | 15 | Phytosphingosine | 植物鞘氨醇，和神经酰胺相关的成分，帮助维持头皮屏障。 | Phytosphingosine is related to ceramides and helps support the scalp barrier. |   |
| 2026-10-17 | 14 | 1,2-Hexanediol | 1,2-己二醇，保湿和溶剂成分，也常用来辅助防腐。 | 1,2-Hexanediol is a humectant and solvent that also supports preservation. |   |
| 2026-10-17 | 14 | Camellia Sinensis Leaf Extract | 茶叶提取物，含多酚，主要起抗氧化作用。 | Green tea leaf extract contains polyphenols and acts mainly as an antioxidant. |   |
| 2026-10-17 | 14 | Caprylic/Capric Triglyceride | 辛酸/癸酸甘油三酯，来自椰子油的轻盈润泽油脂，不油腻。 | Caprylic/capric triglyceride is a light, non-greasy emollient derived from coconut oil. |   |
| 2026-10-17 | 14 | Cholesterol | 胆固醇，皮肤屏障中本来就有的脂质，常和神经酰胺搭配使用。 | Cholesterol is a lipid naturally found in the skin barrier, often paired with ceramides. |   |
| 2026-10-17 | 14 | Cocamide MEA | 椰油酰胺 MEA，增加泡沫、让洗发水变稠。 | Cocamide MEA boosts foam and thickens shampoo. |   |
| 2026-10-17 | 14 | Disodium Laureth Sulfosuccinate | 月桂醇聚醚磺基琥珀酸酯二钠，较温和的清洁成分，常和其他清洁成分搭配。 | Disodium laureth sulfosuccinate is a relatively mild cleanser, often paired with other surfactants. |   |
| 2026-10-17 | 13 | Pentylene Glycol | 戊二醇，保湿和溶剂成分，也有辅助防腐作用。 | Pentylene glycol is a humectant and solvent with some preservative-boosting action. |   |
| 2026-10-17 | 12 | Butyrospermum Parkii Butter | 乳木果油，润泽成分，让头发柔软、减少干涩。 | Shea butter is an emollient that softens hair and eases dryness. |   |
| 2026-10-17 | 12 | Helianthus Annuus Seed Oil | 向日葵籽油，润泽头发的植物油。 | Sunflower seed oil is a plant oil that conditions hair. |   |
| 2026-10-17 | 12 | Persea Gratissima Oil | 鳄梨油，润泽头发的植物油。 | Avocado oil is a plant oil that conditions hair. |   |
| 2026-10-17 | 12 | Potassium Hydroxide | 氢氧化钾，少量用来调节酸碱度，在配方中会被中和。 | Potassium hydroxide is used in small amounts to adjust pH and is neutralised in the formula. |   |
| 2026-10-17 | 12 | PPG-5-Ceteth-20 | PPG-5-鲸蜡醇聚醚-20，乳化和增溶成分，帮助油性成分溶在水里。 | PPG-5-ceteth-20 emulsifies and solubilises oily ingredients in water. |   |
| 2026-10-17 | 11 | Dipropylene Glycol | 二丙二醇，溶剂，常用来溶解香料。 | Dipropylene glycol is a solvent, often used to dissolve fragrance. |   |
| 2026-10-17 | 11 | Hydrolyzed Soy Protein | 水解大豆蛋白，蛋白类调理成分，让头发更好梳理。 | Hydrolyzed soy protein is a protein conditioner that makes hair easier to manage. |   |
| 2026-10-17 | 11 | Hydrolyzed Vegetable Protein PG-Propyl Silanetriol | 水解植物蛋白 PG-丙基硅烷三醇，蛋白类调理成分，附着在头发上，帮助改善受损发的手感。 | Hydrolyzed vegetable protein PG-propyl silanetriol is a protein conditioner that clings to hair to improve the feel of damaged strands. |   |
| 2026-10-17 | 11 | Hydroxyethylcellulose | 羟乙基纤维素，来自植物纤维素的增稠剂。 | Hydroxyethylcellulose is a cellulose-derived thickener. |   |
| 2026-10-17 | 11 | PEG-55 Propylene Glycol Oleate | PEG-55 丙二醇油酸酯，增稠和辅助清洁成分。 | PEG-55 propylene glycol oleate thickens and helps cleanse. |   |
| 2026-10-17 | 11 | Stearamidopropyl Dimethylamine | 硬脂酰胺丙基二甲胺，护发素中常见的调理成分，在酸性配方中带正电，吸附在头发上。 | Stearamidopropyl dimethylamine is a common conditioner that becomes positively charged in acidic formulas and clings to hair. |   |
| 2026-10-17 | 10 | Cetyl Alcohol | 鲸蜡醇，一种脂肪醇，不是会让头发变干的酒精；让质地顺滑并软化头发。 | Cetyl alcohol is a fatty alcohol, not a drying alcohol; it adds creaminess and softens hair. |   |
| 2026-10-17 | 10 | CI 60730 | CI 60730，紫色色素，给产品上色；在紫色洗发水中用来中和黄调。 | CI 60730 is a violet dye that colours the product; in purple shampoos it helps counter yellow tones. |   |
| 2026-10-17 | 10 | Lactic Acid | 乳酸，调节酸碱度，也有保湿作用。 | Lactic acid adjusts pH and also helps hold moisture. |   |
| 2026-10-17 | 10 | PEG-150 Distearate | PEG-150 二硬脂酸酯，主要用来让洗发水变稠。 | PEG-150 distearate is mainly used to thicken shampoo. |   |
| 2026-10-17 | 10 | Sodium Lauryl Sulfoacetate | 月桂醇磺乙酸钠，清洁和起泡成分，通常比月桂醇硫酸钠温和。 | Sodium lauryl sulfoacetate is a cleansing, foaming agent, usually milder than sodium lauryl sulfate. |   |
| 2026-10-17 | 10 | Sorbitol | 山梨糖醇，保湿成分，帮助吸住水分。 | Sorbitol is a humectant that helps hold water. |   |
| 2026-10-17 | 9 | Stearyl Alcohol | 硬脂醇，一种脂肪醇，不是会让头发变干的酒精；让护发素质地顺滑。 | Stearyl alcohol is a fatty alcohol, not a drying alcohol; it makes conditioner creamy. |   |
| 2026-10-17 | 8 | Acetic Acid | 乙酸，即醋酸，用来调节酸碱度。 | Acetic acid (the acid in vinegar) adjusts pH. |   |
| 2026-10-17 | 8 | Behentrimonium Methosulfate | 山嵛基三甲基铵甲基硫酸盐，调理成分，减少打结和静电。 | Behentrimonium methosulfate is a conditioner that reduces tangles and static. |   |
| 2026-10-17 | 8 | Cetyl Esters | 鲸蜡酯类，蜡状润泽成分，让质地更丰润。 | Cetyl esters are waxy emollients that give a richer texture. |   |
| 2026-10-17 | 8 | Dimethiconol | 聚二甲基硅氧烷醇，一种硅油，让头发顺滑、有光泽。 | Dimethiconol is a silicone that adds slip and shine. |   |
| 2026-10-17 | 8 | Glycine | 甘氨酸，一种氨基酸，用于调理头发和调节酸碱度。 | Glycine is an amino acid used to condition hair and buffer pH. |   |
| 2026-10-17 | 8 | Hydroxypropyl Guar Hydroxypropyltrimonium Chloride | 羟丙基瓜儿胶羟丙基三甲基氯化铵，瓜儿胶类调理成分，减少静电、让头发好梳。 | Hydroxypropyl guar hydroxypropyltrimonium chloride is a guar-based conditioner that reduces static and eases combing. |   |
| 2026-10-17 | 8 | Sodium Lauroyl Methyl Isethionate | 月桂酰甲基羟乙磺酸钠，温和的清洁成分，泡沫细腻。 | Sodium lauroyl methyl isethionate is a mild cleanser with a fine lather. |   |
| 2026-10-17 | 8 | Squalane | 角鲨烷，轻盈不油腻的润泽油脂。 | Squalane is a light, non-greasy emollient. |   |
| 2026-10-17 | 8 | Trideceth-10 | 十三烷醇聚醚-10，辅助清洁和乳化成分。 | Trideceth-10 is a co-cleanser and emulsifier. |   |
| 2026-10-17 | 7 | Argania Spinosa Kernel Oil | 摩洛哥坚果油（阿甘油），润泽头发、增加光泽的植物油。 | Argan oil is a plant oil that conditions hair and adds shine. |   |
| 2026-10-17 | 7 | Coconut Acid | 椰油酸，来自椰子油的脂肪酸，用于清洁和润泽。 | Coconut acid is a coconut-derived fatty acid used for cleansing and softening. |   |
| 2026-10-17 | 7 | Fumaric Acid | 富马酸，用来调节酸碱度。 | Fumaric acid adjusts pH. |   |
| 2026-10-17 | 7 | Polysorbate 20 | 聚山梨醇酯-20，增溶剂，帮助香料和油性成分溶在水里。 | Polysorbate 20 is a solubiliser that helps fragrance and oils dissolve in water. |   |
| 2026-10-17 | 7 | Simmondsia Chinensis Seed Oil | 荷荷巴籽油，质地接近皮脂的植物油，润泽头发和头皮。 | Jojoba seed oil is a plant oil similar to sebum that conditions hair and scalp. |   |
| 2026-10-17 | 7 | Sodium Isethionate | 羟乙磺酸钠，清洁成分的原料，也有调理作用。 | Sodium isethionate is a building block of mild cleansers and also conditions. |   |
| 2026-10-17 | 6 | Ascorbic Acid | 抗坏血酸，即维生素 C，在洗护产品中主要起抗氧化或调节酸碱度作用。 | Ascorbic acid is vitamin C; in hair care it mainly acts as an antioxidant or pH adjuster. |   |
| 2026-10-17 | 6 | Bisabolol | 红没药醇，最早从洋甘菊中提取，常作为舒缓成分加入。 | Bisabolol, originally from chamomile, is added as a soothing ingredient. |   |
| 2026-10-17 | 6 | Laureth-23 | 月桂醇聚醚-23，乳化和辅助清洁成分。 | Laureth-23 is an emulsifier and co-cleanser. |   |
| 2026-10-17 | 6 | PEG-100 Stearate | PEG-100 硬脂酸酯，乳化成分，让油和水混合均匀。 | PEG-100 stearate is an emulsifier that keeps oil and water mixed. |   |
| 2026-10-17 | 6 | Polyquaternium-37 | 聚季铵盐-37，调理和增稠成分，让头发好梳理。 | Polyquaternium-37 conditions and thickens, making hair easier to comb. |   |
| 2026-10-17 | 6 | Trideceth-3 | 十三烷醇聚醚-3，乳化和辅助清洁成分。 | Trideceth-3 is an emulsifier and co-cleanser. |   |
| 2026-10-17 | 6 | Triethyl Citrate | 柠檬酸三乙酯，溶剂成分，常用来溶解香料，也有除臭作用。 | Triethyl citrate is a solvent often used to carry fragrance; it also has deodorising action. |   |
| 2026-10-17 | 5 | C12-15 Pareth-3 | C12-15 链烷醇聚醚-3，乳化和辅助清洁成分。 | C12-15 pareth-3 is an emulsifier and co-cleanser. |   |
| 2026-10-17 | 5 | Chlorhexidine Dihydrochloride | 氯己定二盐酸盐，抗菌防腐成分，用量有法规上限。 | Chlorhexidine dihydrochloride is an antimicrobial preservative with a regulated maximum concentration. |   |
| 2026-10-17 | 5 | Cocamidopropylamine Oxide | 椰油酰胺丙基氧化胺，辅助清洁和增加泡沫的成分。 | Cocamidopropylamine oxide is a co-cleanser and foam booster. |   |
| 2026-10-17 | 5 | Helianthus Annuus Seed Extract | 向日葵籽提取物，护理和保护头发的植物成分。 | Sunflower seed extract is a plant ingredient used to condition and protect hair. |   |
| 2026-10-17 | 5 | Hibiscus Sabdariffa Flower Extract | 玫瑰茄花提取物，护肤调理用的植物成分。 | Hibiscus flower extract is a plant ingredient used for conditioning. |   |
| 2026-10-17 | 5 | Hippophae Rhamnoides Fruit/Seed Oil | 沙棘果/籽油，润泽用的植物油。 | Sea buckthorn fruit/seed oil is a conditioning plant oil. |   |
| 2026-10-17 | 5 | Hydrolyzed Quinoa | 水解藜麦，植物蛋白类调理成分。 | Hydrolyzed quinoa is a plant protein conditioner. |   |
| 2026-10-17 | 5 | Hydrolyzed Rice Protein | 水解大米蛋白，蛋白类调理成分，让头发更好梳理。 | Hydrolyzed rice protein is a protein conditioner that makes hair easier to manage. |   |
| 2026-10-17 | 5 | Isopropyl Myristate | 肉豆蔻酸异丙酯，轻盈的润泽油脂。 | Isopropyl myristate is a light emollient. |   |
| 2026-10-17 | 5 | PPG-1 Trideceth-6 | PPG-1 十三烷醇聚醚-6，辅助清洁和调理成分。 | PPG-1 trideceth-6 is a co-cleanser and conditioner. |   |
| 2026-10-17 | 5 | Prunus Armeniaca Kernel Oil | 杏仁油（杏核油），润泽用的植物油。 | Apricot kernel oil is a conditioning plant oil. |   |
| 2026-10-17 | 5 | Ricinus Communis Seed Oil | 蓖麻籽油，质地浓稠的植物油，润泽头发。 | Castor seed oil is a thick plant oil that conditions hair. |   |
| 2026-10-17 | 5 | Sodium Acetate | 乙酸钠，用来调节和稳定酸碱度。 | Sodium acetate buffers and stabilises pH. |   |
| 2026-10-17 | 5 | Sodium Sarcosinate | 肌氨酸钠，调理和调节稠度的成分。 | Sodium sarcosinate conditions and adjusts thickness. |   |
| 2026-10-17 | 5 | Steareth-6 | 硬脂醇聚醚-6，乳化成分。 | Steareth-6 is an emulsifier. |   |
| 2026-10-17 | 5 | Trideceth-12 | 十三烷醇聚醚-12，乳化和辅助清洁成分。 | Trideceth-12 is an emulsifier and co-cleanser. |   |
