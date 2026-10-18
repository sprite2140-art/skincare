# 成分核对表

由 `npm run ingredient-review` 生成，请勿手改；数据更新后重新运行。核对结果请记在 data/ingredients.csv（review_status 改为 verified，填写 reviewed_on），再重新生成本表。

只列影响打分的成分：有效成分（针对需求，影响需求匹配和证据强度）、风险成分（影响刺激风险、香味层级、孕期 / 处方药提示和想避开的成分）、螯合剂清单和加香清单上的成分。基础成分不列。
共 88 个，出现在 107 个产品中；其中未核对 88 个。按影响的产品数排序。

核对时请逐项确认：中文名、声称的作用（针对的需求 / 风险标签）、证据等级（A / B / C）、有效浓度与法规限量、来源是否支持这些结论。
"核对结果"栏留给核对人填写：✅ 通过 / ✏️ 需修改（写明改什么）/ ❌ 删除。

| 产品数 | 成分 | 中文名 | 声称的作用 | 影响 | 证据等级 | 有效浓度 / 限量 | 来源 | 状态 | 核对结果 |
|---:|---|---|---|---|---|---|---|---|---|
| 93 | Fragrance | 香精 | 香精 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj) | 未核对 |   |
| 54 | Limonene | 柠檬烯 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 49 | Linalool | 芳樟醇 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 34 | Hexyl Cinnamal | 己基肉桂醛 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 33 | Salicylic Acid | 水杨酸 | 针对头皮屑、头皮油 | 需求匹配、证据强度 | B | 去屑 1.8%–3%（美国 OTC）；欧盟洗发类冲洗型 3% | [ecfr.gov](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-358/subpart-H)<br>[aad.org](https://www.aad.org/public/everyday-care/hair-scalp-care/scalp/treat-dandruff)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 30 | Benzyl Alcohol | 苯甲醇 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 29 | Disodium EDTA | EDTA 二钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CIR：EDTA 及其盐类安全评估（PMID 12396676）](https://pubmed.ncbi.nlm.nih.gov/12396676/)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 28 | Isopropyl Alcohol | 异丙醇 | 酒精 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 23 | Panthenol | 泛醇 | 针对受损、干燥、头皮痒 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 28503966](https://pubmed.ncbi.nlm.nih.gov/28503966/)<br>[PMID 12113650](https://pubmed.ncbi.nlm.nih.gov/12113650/) | 未核对 |   |
| 22 | Sodium Laureth Sulfate | 月桂醇聚醚硫酸酯钠 | 强清洁力表活 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 12641575](https://pubmed.ncbi.nlm.nih.gov/12641575/)<br>[PMID 11278060](https://pubmed.ncbi.nlm.nih.gov/11278060/) | 未核对 |   |
| 18 | Hydroxycitronellal | 羟基香茅醛 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 18 | Sodium C14-16 Olefin Sulfonate | C14-16 烯烃磺酸钠 | 强清洁力表活 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 18 | Sodium Hyaluronate | 透明质酸钠 | 针对干燥 | 需求匹配、证据强度 | B | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 35833366](https://pubmed.ncbi.nlm.nih.gov/35833366/)<br>[PMID 24688623](https://pubmed.ncbi.nlm.nih.gov/24688623/) | 未核对 |   |
| 15 | Coumarin | 香豆素 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 15 | Tetrasodium EDTA | EDTA 四钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CIR：EDTA 及其盐类安全评估（PMID 12396676）](https://pubmed.ncbi.nlm.nih.gov/12396676/)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 13 | Menthol | 薄荷醇 | 针对头皮痒 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 27141849](https://pubmed.ncbi.nlm.nih.gov/27141849/) | 未核对 |   |
| 12 | Amyl Cinnamal | 戊基肉桂醛 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 12 | Citronellol | 香茅醇 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 12 | Niacinamide | 烟酰胺 | 针对出油、泛红敏感、暗沉色斑、毛孔、细纹松弛 | 需求匹配、证据强度 | B | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 34439563](https://pubmed.ncbi.nlm.nih.gov/34439563/)<br>[PMID 18492135](https://pubmed.ncbi.nlm.nih.gov/18492135/) | 未核对 |   |
| 11 | Rosmarinus Officinalis Leaf Oil | 迷迭香叶油 | 针对掉发；精油 | 需求匹配、证据强度；刺激风险；香味层级 | C | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[PMID 25842469](https://pubmed.ncbi.nlm.nih.gov/25842469/) | 未核对 |   |
| 10 | Benzyl Salicylate | 水杨酸苄酯 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 10 | Ceramide NP | 神经酰胺 NP | 针对干燥、受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 34596254](https://pubmed.ncbi.nlm.nih.gov/34596254/)<br>[PMID 31585489](https://pubmed.ncbi.nlm.nih.gov/31585489/) | 未核对 |   |
| 9 | Biotin | 生物素 | 针对掉发 | 需求匹配、证据强度 | C | — | [PMID 28879195](https://pubmed.ncbi.nlm.nih.gov/28879195/) | 未核对 |   |
| 9 | Methylchloroisothiazolinone | 甲基氯异噻唑啉酮 | 致敏成分 | 刺激风险 | — | 欧盟仅允许用于冲洗型产品（与 MI 混合物 0.0015%） | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 9 | Methylisothiazolinone | 甲基异噻唑啉酮 | 致敏成分 | 刺激风险 | — | 欧盟仅允许用于冲洗型产品，0.0015% | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 9 | Tetrasodium Glutamate Diacetate | 谷氨酸二乙酸四钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/84400)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 8 | Ceramide AP | 神经酰胺 AP | 针对干燥、受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 8 | Citrus Aurantium Peel Oil | 苦橙果皮油 | 精油；香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/100219)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 8 | Hydrolyzed Keratin | 水解角蛋白 | 针对受损、干枯毛躁 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 8 | TEA-Dodecylbenzenesulfonate | 十二烷基苯磺酸 TEA 盐 | 强清洁力表活 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 7 | Benzyl Benzoate | 苯甲酸苄酯 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 7 | Ceramide EOP | 神经酰胺 EOP | 针对干燥、受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 7 | Geraniol | 香叶醇 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 7 | Sodium Lauryl Sulfate | 月桂醇硫酸酯钠 | 强清洁力表活 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 6 | Alpha-Isomethyl Ionone | α-异甲基紫罗兰酮 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 6 | Trisodium Ethylenediamine Disuccinate | 乙二胺二琥珀酸三钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/59889)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 5 | Ceramide NG | 神经酰胺 NG | 针对干燥、受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 5 | Piroctone Olamine | 吡罗克酮乙醇胺盐 | 针对头皮屑、头皮痒 | 需求匹配、证据强度 | B | 0.5%–1%（冲洗型）；欧盟冲洗型产品 1% | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 18503415](https://pubmed.ncbi.nlm.nih.gov/18503415/)<br>[PMID 10773717](https://pubmed.ncbi.nlm.nih.gov/10773717/) | 未核对 |   |
| 5 | Sodium Phytate | 植酸钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/79995)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 4 | Hydrolyzed Collagen | 水解胶原 | 针对受损、扁塌 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 4 | Melaleuca Alternifolia Leaf Oil | 互生叶白千层叶油（茶树油） | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Acetyl Tetrapeptide-3 | 乙酰基四肽-3 | 针对掉发 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 33584955](https://pubmed.ncbi.nlm.nih.gov/33584955/) | 未核对 |   |
| 3 | Alcohol | 乙醇 | 酒精 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Caffeine | 咖啡因 | 针对掉发 | 需求匹配、证据强度 | C | — | [PMID 39997270](https://pubmed.ncbi.nlm.nih.gov/39997270/) | 未核对 |   |
| 3 | Citral | 柠檬醛 | 香精；欧盟香料致敏原 | 刺激风险；香味层级 | — | — | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | CURCUMA LONGA ROOT EXTRACT | — | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/75441)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Hydrolyzed Hyaluronic Acid | 水解透明质酸 | 针对干燥 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Linalyl Acetate | 乙酸芳樟酯 | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/77311)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Mentha Piperita Oil | 辣薄荷油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | Serenoa Serrulata Fruit Extract | 锯棕榈果提取物 | 针对掉发 | 需求匹配、证据强度 | C | — | [PMID 33313047](https://pubmed.ncbi.nlm.nih.gov/33313047/)<br>[PMID 38021422](https://pubmed.ncbi.nlm.nih.gov/38021422/) | 未核对 |   |
| 3 | Sodium Salicylate | 水杨酸钠 | 针对头皮屑 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 3 | TRISODIUM HEDTA | — | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CIR：EDTA 及其盐类安全评估（PMID 12396676）](https://pubmed.ncbi.nlm.nih.gov/12396676/)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Alcohol Denat. | 变性乙醇 | 酒精 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Ammonium Lauryl Sulfate | 月桂醇硫酸酯铵 | 强清洁力表活 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Bis-Aminopropyl Diglycol Dimaleate | 双氨丙基二甘醇二马来酸酯 | 针对受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>⚠️ [仅检索入口](https://pubmed.ncbi.nlm.nih.gov/?term=bis-aminopropyl+diglycol+dimaleate) | 未核对 |   |
| 2 | Ceramide AG | 神经酰胺 AG | 针对干燥、受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | COCOS NUCIFERA WATER | — | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/55635)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Dipotassium Glycyrrhizate | 甘草酸二钾 | 针对头皮痒、头皮发红、泛红敏感 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 40735556](https://pubmed.ncbi.nlm.nih.gov/40735556/)<br>[PMID 30506356](https://pubmed.ncbi.nlm.nih.gov/30506356/) | 未核对 |   |
| 2 | Iodopropynyl Butylcarbamate | 碘丙炔醇丁基氨甲酸酯 | 致敏成分 | 刺激风险 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Ketoconazole | 酮康唑 | 针对头皮屑、头皮痒 | 需求匹配、证据强度 | A | 1%（美国非处方） | [aad.org](https://www.aad.org/public/everyday-care/hair-scalp-care/scalp/treat-dandruff) | 未核对 |   |
| 2 | Mentha Arvensis Leaf Oil | 野薄荷叶油 | 精油；香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/57860)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Menthyl Lactate | 乳酸薄荷酯 | 针对头皮痒 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | ROSMARINUS OFFICINALIS LEAF WATER | — | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/59425)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 2 | Selenium Sulfide | 二硫化硒 | 针对头皮屑、头皮痒 | 需求匹配、证据强度 | A | 0.6%–1%（美国非处方） | [ecfr.gov](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-358/subpart-H/section-358.710)<br>[aad.org](https://www.aad.org/public/everyday-care/hair-scalp-care/scalp/treat-dandruff) | 未核对 |   |
| 2 | Terpineol | 松油醇 | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/80711)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Abies Sibirica Oil | 西伯利亚冷杉油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Anthemis Nobilis Flower Oil | 罗马洋甘菊花油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Cedrus Atlantica Bark Oil | 北非雪松树皮油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Citrus Aurantium Dulcis Flower Oil | 甜橙花油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Citrus Limon Peel Oil | 柠檬果皮油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Copper Tripeptide-1 | 铜肽-1 | 针对掉发 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>⚠️ [仅检索入口](https://pubmed.ncbi.nlm.nih.gov/?term=GHK-Cu+hair) | 未核对 |   |
| 1 | Cupressus Sempervirens Oil | 地中海柏木油 | 精油；香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/83473)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | EDTA | 乙二胺四乙酸 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CIR：EDTA 及其盐类安全评估（PMID 12396676）](https://pubmed.ncbi.nlm.nih.gov/12396676/)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Eucalyptus Globulus Leaf Oil | 蓝桉叶油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Illicium Verum Fruit/Seed Oil | 八角茴香果/籽油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Juniperus Communis Fruit Oil | 欧洲刺柏果油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Juniperus Virginiana Oil | 北美圆柏油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | LAVANDULA OIL/EXTRACT | — | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/100225)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Ocimum Basilicum Oil | 罗勒油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Phytic Acid | 植酸 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/36555)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Pyrithione Zinc | 吡硫鎓锌 | 针对头皮屑、头皮痒；孕期需注意成分 | 需求匹配、证据强度；孕期 / 处方药提示 | A | 美国 OTC 冲洗型 1%–2%；欧盟禁用（2022 年起） | [ecfr.gov](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-358/subpart-H)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2021/1902/oj)<br>[aad.org](https://www.aad.org/public/everyday-care/hair-scalp-care/scalp/treat-dandruff) | 未核对 |   |
| 1 | sh-Oligopeptide-78 | sh-寡肽-78 | 针对受损 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Terpinolene | 萜品油烯 | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/41511)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Tetrasodium Iminodisuccinate | 亚氨基二琥珀酸四钠 | 螯合剂（清单） | 环境适配、产品残留 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/60284)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Turpentine | 松节油 | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/41521)<br>[eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2023/1545/oj)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Tussilago Farfara Leaf Extract | 款冬叶提取物 | 针对头皮屑、头皮痒 | 需求匹配、证据强度 | C | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)<br>[PMID 40892112](https://pubmed.ncbi.nlm.nih.gov/40892112/) | 未核对 |   |
| 1 | VIOLA ODORATA LEAF EXTRACT | — | 香精；加香（清单） | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/details/80615)<br>[CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
| 1 | Zingiber Officinale Root Oil | 姜根油 | 精油 | 刺激风险；香味层级 | — | — | [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/) | 未核对 |   |
