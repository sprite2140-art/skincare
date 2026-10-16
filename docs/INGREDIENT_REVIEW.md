# 成分核对清单

由 `npm run ingredient-review` 生成，请勿手改；数据更新后重新运行。

待核对的有效成分和风险成分共 57 个（基础成分不需要人工核对）。按在 18 个产品中出现的次数排序。
核对时请逐项确认：中文名、针对的困扰（targets）、证据等级、风险标签、有效浓度与法规限量，以及来源链接。
"文献"列只列 PubMed 文献；监管来源（欧盟 CosIng、EUR-Lex、美国 eCFR）和 AAD 等链接在 data/ingredients.csv 的 sources 字段里。
⚠️ 以下 2 个成分没有找到合适的具体文献，仍是 PubMed 检索入口：Bis-Aminopropyl Diglycol Dimaleate、Copper Tripeptide-1。
核对通过后，在 data/ingredients.csv 中把 review_status 改为 verified，并填写 reviewed_on。

| 产品数 | 成分 | 中文名 | 类别 | 针对 | 证据 | 风险标签 | 有效浓度 / 限量 | 文献 |
|---|---|---|---|---|---|---|---|---|
| 14 | Parfum | 香精 | risk | — | — | fragrance | — | — |
| 8 | Salicylic Acid | 水杨酸 | active | dandruff, scalp_oil | B | — | 去屑 1.8%–3%（美国 OTC）；欧盟洗发类冲洗型 3% | — |
| 8 | Sodium C14-16 Olefin Sulfonate | C14-16 烯烃磺酸钠 | risk | — | — | strong_cleanser | — | — |
| 7 | Limonene | 柠檬烯 | risk | — | — | fragrance | — | — |
| 7 | Niacinamide | 烟酰胺 | active | oil, redness, pigmentation, pores, aging | B | — | — | [PMID 34439563](https://pubmed.ncbi.nlm.nih.gov/34439563/)<br>[PMID 18492135](https://pubmed.ncbi.nlm.nih.gov/18492135/) |
| 6 | Ceramide NP | 神经酰胺 NP | active | dryness, damage | C | — | — | [PMID 34596254](https://pubmed.ncbi.nlm.nih.gov/34596254/)<br>[PMID 31585489](https://pubmed.ncbi.nlm.nih.gov/31585489/) |
| 5 | Linalool | 芳樟醇 | risk | — | — | fragrance | — | — |
| 5 | Panthenol | 泛醇 | active | damage, dryness, scalp_itch | C | — | — | [PMID 28503966](https://pubmed.ncbi.nlm.nih.gov/28503966/)<br>[PMID 12113650](https://pubmed.ncbi.nlm.nih.gov/12113650/) |
| 4 | Ceramide AP | 神经酰胺 AP | active | dryness, damage | C | — | — | — |
| 4 | Ceramide NG | 神经酰胺 NG | active | dryness, damage | C | — | — | — |
| 4 | Hydrolyzed Keratin | 水解角蛋白 | active | damage, frizz | C | — | — | — |
| 4 | Menthol | 薄荷醇 | active | scalp_itch | C | — | — | [PMID 27141849](https://pubmed.ncbi.nlm.nih.gov/27141849/) |
| 4 | Piroctone Olamine | 吡罗克酮乙醇胺盐 | active | dandruff, scalp_itch | B | — | 0.5%–1%（冲洗型）；欧盟冲洗型产品 1% | [PMID 18503415](https://pubmed.ncbi.nlm.nih.gov/18503415/)<br>[PMID 10773717](https://pubmed.ncbi.nlm.nih.gov/10773717/) |
| 4 | Rosmarinus Officinalis Leaf Oil | 迷迭香叶油 | active | hair_loss | C | essential_oil | — | [PMID 25842469](https://pubmed.ncbi.nlm.nih.gov/25842469/) |
| 4 | Sodium Hyaluronate | 透明质酸钠 | active | dryness | B | — | — | [PMID 35833366](https://pubmed.ncbi.nlm.nih.gov/35833366/)<br>[PMID 24688623](https://pubmed.ncbi.nlm.nih.gov/24688623/) |
| 3 | Alcohol | 乙醇 | risk | — | — | alcohol | — | — |
| 3 | Biotin | 生物素 | active | hair_loss | C | — | — | [PMID 28879195](https://pubmed.ncbi.nlm.nih.gov/28879195/) |
| 3 | Caffeine | 咖啡因 | active | hair_loss | C | — | — | [PMID 39997270](https://pubmed.ncbi.nlm.nih.gov/39997270/) |
| 3 | Ceramide EOP | 神经酰胺 EOP | active | dryness, damage | C | — | — | — |
| 3 | Hexyl Cinnamal | 己基肉桂醛 | risk | — | — | fragrance | — | — |
| 3 | Hydrolyzed Collagen | 水解胶原 | active | damage, flat_hair | C | — | — | — |
| 2 | Acetyl Tetrapeptide-3 | 乙酰基四肽-3 | active | hair_loss | C | — | — | [PMID 33584955](https://pubmed.ncbi.nlm.nih.gov/33584955/) |
| 2 | Alpha-Isomethyl Ionone | α-异甲基紫罗兰酮 | risk | — | — | fragrance | — | — |
| 2 | Benzyl Alcohol | 苯甲醇 | risk | — | — | fragrance | — | — |
| 2 | Benzyl Salicylate | 水杨酸苄酯 | risk | — | — | fragrance | — | — |
| 2 | Citronellol | 香茅醇 | risk | — | — | fragrance | — | — |
| 2 | Dipotassium Glycyrrhizate | 甘草酸二钾 | active | scalp_itch, scalp_redness, redness | C | — | — | [PMID 40735556](https://pubmed.ncbi.nlm.nih.gov/40735556/)<br>[PMID 30506356](https://pubmed.ncbi.nlm.nih.gov/30506356/) |
| 2 | Isopropyl Alcohol | 异丙醇 | risk | — | — | alcohol | — | — |
| 2 | Sodium Laureth Sulfate | 月桂醇聚醚硫酸酯钠 | risk | — | — | strong_cleanser | — | [PMID 12641575](https://pubmed.ncbi.nlm.nih.gov/12641575/)<br>[PMID 11278060](https://pubmed.ncbi.nlm.nih.gov/11278060/) |
| 2 | Sodium Salicylate | 水杨酸钠 | active | dandruff | C | — | — | — |
| 1 | Abies Sibirica Oil | 西伯利亚冷杉油 | risk | — | — | essential_oil | — | — |
| 1 | Alcohol Denat. | 变性乙醇 | risk | — | — | alcohol | — | — |
| 1 | Anthemis Nobilis Flower Oil | 罗马洋甘菊花油 | risk | — | — | essential_oil | — | — |
| 1 | Bis-Aminopropyl Diglycol Dimaleate | 双氨丙基二甘醇二马来酸酯 | active | damage | C | — | — | ⚠️ [仅检索入口，未找到具体文献](https://pubmed.ncbi.nlm.nih.gov/?term=bis-aminopropyl+diglycol+dimaleate) |
| 1 | Cedrus Atlantica Bark Oil | 北非雪松树皮油 | risk | — | — | essential_oil | — | — |
| 1 | Ceramide AG | 神经酰胺 AG | active | dryness, damage | C | — | — | — |
| 1 | Citral | 柠檬醛 | risk | — | — | fragrance | — | — |
| 1 | Citrus Aurantium Dulcis Flower Oil | 甜橙花油 | risk | — | — | essential_oil | — | — |
| 1 | Citrus Aurantium Peel Oil | 苦橙果皮油 | risk | — | — | essential_oil | — | — |
| 1 | Citrus Limon Peel Oil | 柠檬果皮油 | risk | — | — | essential_oil | — | — |
| 1 | Copper Tripeptide-1 | 铜肽-1 | active | hair_loss | C | — | — | ⚠️ [仅检索入口，未找到具体文献](https://pubmed.ncbi.nlm.nih.gov/?term=GHK-Cu+hair) |
| 1 | Cupressus Sempervirens Oil | 地中海柏木油 | risk | — | — | essential_oil | — | — |
| 1 | Eucalyptus Globulus Leaf Oil | 蓝桉叶油 | risk | — | — | essential_oil | — | — |
| 1 | Hydroxycitronellal | 羟基香茅醛 | risk | — | — | fragrance | — | — |
| 1 | Illicium Verum Fruit/Seed Oil | 八角茴香果/籽油 | risk | — | — | essential_oil | — | — |
| 1 | Iodopropynyl Butylcarbamate | 碘丙炔醇丁基氨甲酸酯 | risk | — | — | sensitizer | — | — |
| 1 | Juniperus Virginiana Oil | 北美圆柏油 | risk | — | — | essential_oil | — | — |
| 1 | Mentha Arvensis Leaf Oil | 野薄荷叶油 | risk | — | — | essential_oil | — | — |
| 1 | Mentha Piperita Oil | 辣薄荷油 | risk | — | — | essential_oil | — | — |
| 1 | Menthyl Lactate | 乳酸薄荷酯 | active | scalp_itch | C | — | — | — |
| 1 | Ocimum Basilicum Oil | 罗勒油 | risk | — | — | essential_oil | — | — |
| 1 | Pyrithione Zinc | 吡硫鎓锌 | active | dandruff, scalp_itch | A | pregnancy_caution | 美国 OTC 冲洗型 1%–2%；欧盟禁用（2022 年起） | — |
| 1 | Serenoa Serrulata Fruit Extract | 锯棕榈果提取物 | active | hair_loss | C | — | — | [PMID 33313047](https://pubmed.ncbi.nlm.nih.gov/33313047/)<br>[PMID 38021422](https://pubmed.ncbi.nlm.nih.gov/38021422/) |
| 1 | sh-Oligopeptide-78 | sh-寡肽-78 | active | damage | C | — | — | — |
| 1 | TEA-Dodecylbenzenesulfonate | 十二烷基苯磺酸 TEA 盐 | risk | — | — | strong_cleanser | — | — |
| 1 | Tetramethyl Acetyloctahydronaphthalenes | 四甲基乙酰基八氢萘 | risk | — | — | fragrance | — | — |
| 1 | Tussilago Farfara Leaf Extract | 款冬叶提取物 | active | dandruff, scalp_itch | C | — | — | [PMID 40892112](https://pubmed.ncbi.nlm.nih.gov/40892112/) |
