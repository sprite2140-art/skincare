# 规则清单类成分核对

由 `npm run verify-list-ingredients` 生成（2026-10-27），请勿手改。

核对依据：CosIng 官方导出（2026-10-17，data/cosing_export_2026-10-17.csv）；欧盟香料致敏原：法规 2023/1545 官方原文（docs/sources/eu_2023_1545.pdf）和 1223/2009 合并版（docs/sources/eu_1223_2009_consolidated.pdf）的逐条记录 data/eu_allergen_checks.csv。

共 55 个成分：通过 55 个，对不上 0 个，无法核对 0 个。
一个成分属于多个清单时，每项都通过才算通过。

| 成分 | 清单 | 结果 | 依据 / 说明 | 原状态 |
|---|---|---|---|---|
| Abies Sibirica Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 31550） | 已核对 |
| Alcohol | 酒精 | ✅ 通过 | CosIng 收录该 INCI，登记功能含溶剂（SOLVENT），"会让皮肤变干"有文献出处（见 sources）（CosIng 31401） | 已核对 |
| Alcohol Denat. | 酒精 | ✅ 通过 | CosIng 收录该 INCI，登记功能含溶剂（SOLVENT），"会让皮肤变干"有文献出处（见 sources）（CosIng 74174） | 已核对 |
| Alpha-Isomethyl Ionone | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 39665） | 已核对 |
| Alpha-Isomethyl Ionone | 欧盟香料致敏原 | ✅ 通过 | 法规 1223/2009 合并版附录 III（docs/sources/eu_1223_2009_consolidated.pdf）条目 90，Common Ingredients Glossary 名称为 alpha-Isomethyl ionone | 已核对 |
| Ammonium Lauryl Sulfate | 强清洁力表活 | ✅ 通过 | CosIng 登记功能含清洁型表活（SURFACTANT - CLEANSING），"强清洁力"有文献出处（见 sources）（CosIng 74412） | 已核对 |
| Amyl Cinnamal | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 31923） | 已核对 |
| Amyl Cinnamal | 欧盟香料致敏原 | ✅ 通过 | 法规 1223/2009 合并版附录 III（docs/sources/eu_1223_2009_consolidated.pdf）条目 67，Common Ingredients Glossary 名称为 Amyl cinnamal | 已核对 |
| Anthemis Nobilis Flower Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 74310） | 已核对 |
| Benzyl Alcohol | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 32153） | 已核对 |
| Benzyl Alcohol | 欧盟香料致敏原 | ✅ 通过 | 法规 2023/1545 附录（docs/sources/eu_2023_1545.pdf）条目 45，Common Ingredients Glossary 名称为 Benzyl Alcohol | 已核对 |
| Benzyl Benzoate | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 32154） | 已核对 |
| Benzyl Benzoate | 欧盟香料致敏原 | ✅ 通过 | 法规 1223/2009 合并版附录 III（docs/sources/eu_1223_2009_consolidated.pdf）条目 85，Common Ingredients Glossary 名称为 Benzyl benzoate | 已核对 |
| Benzyl Salicylate | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 32159） | 已核对 |
| Benzyl Salicylate | 欧盟香料致敏原 | ✅ 通过 | 法规 1223/2009 合并版附录 III（docs/sources/eu_1223_2009_consolidated.pdf）条目 75，Common Ingredients Glossary 名称为 Benzyl Salicylate | 已核对 |
| Beta-Caryophyllene | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 54743） | 已核对 |
| Cedrus Atlantica Bark Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 55309） | 已核对 |
| Citral | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 32857） | 已核对 |
| Citral | 欧盟香料致敏原 | ✅ 通过 | 法规 2023/1545 附录（docs/sources/eu_2023_1545.pdf）条目 70，Common Ingredients Glossary 名称为 Citral | 已核对 |
| Citronellol | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 32861） | 已核对 |
| Citronellol | 欧盟香料致敏原 | ✅ 通过 | 法规 2023/1545 附录（docs/sources/eu_2023_1545.pdf）条目 86，Common Ingredients Glossary 名称为 Citronellol | 已核对 |
| Citrus Aurantium Dulcis Flower Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 75211） | 已核对 |
| Citrus Aurantium Peel Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 100219） | 已核对 |
| Citrus Limon Peel Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 85124） | 已核对 |
| Coumarin | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 33057） | 已核对 |
| Coumarin | 欧盟香料致敏原 | ✅ 通过 | 法规 1223/2009 合并版附录 III（docs/sources/eu_1223_2009_consolidated.pdf）条目 77，Common Ingredients Glossary 名称为 Coumarin | 已核对 |
| Cupressus Sempervirens Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 83473） | 已核对 |
| Disodium EDTA | 螯合剂 | ✅ 通过 | CosIng 登记功能含螯合（CHELATING）（CosIng 33604） | 已核对 |
| EDTA | 螯合剂 | ✅ 通过 | CosIng 登记功能含螯合（CHELATING）（CosIng 33756） | 已核对 |
| Eucalyptus Globulus Leaf Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 76052） | 已核对 |
| Fragrance | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 35851） | 已核对 |
| Geraniol | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 33991） | 已核对 |
| Geraniol | 欧盟香料致敏原 | ✅ 通过 | 法规 1223/2009 合并版附录 III（docs/sources/eu_1223_2009_consolidated.pdf）条目 78，Common Ingredients Glossary 名称为 Geraniol | 已核对 |
| Hexyl Cinnamal | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 40233） | 已核对 |
| Hexyl Cinnamal | 欧盟香料致敏原 | ✅ 通过 | 法规 1223/2009 合并版附录 III（docs/sources/eu_1223_2009_consolidated.pdf）条目 87，Common Ingredients Glossary 名称为 Hexyl cinnamal | 已核对 |
| Hydroxycitronellal | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 34491） | 已核对 |
| Hydroxycitronellal | 欧盟香料致敏原 | ✅ 通过 | 法规 1223/2009 合并版附录 III（docs/sources/eu_1223_2009_consolidated.pdf）条目 72，Common Ingredients Glossary 名称为 Hydroxycitronellal | 已核对 |
| Illicium Verum Fruit/Seed Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 82211） | 已核对 |
| Iodopropynyl Butylcarbamate | 致敏防腐剂 | ✅ 通过 | CosIng 登记功能含防腐（PRESERVATIVE），"致敏"有文献出处（见 sources）（CosIng 34582） | 已核对 |
| Isopropyl Alcohol | 酒精 | ✅ 通过 | CosIng 收录该 INCI，登记功能含溶剂（SOLVENT），"会让皮肤变干"有文献出处（见 sources）（CosIng 34680） | 已核对 |
| Juniperus Communis Fruit Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 77977） | 已核对 |
| Juniperus Virginiana Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 78070） | 已核对 |
| Limonene | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 57187） | 已核对 |
| Limonene | 欧盟香料致敏原 | ✅ 通过 | 法规 2023/1545 附录（docs/sources/eu_2023_1545.pdf）条目 88，Common Ingredients Glossary 名称为 Limonene | 已核对 |
| Linalool | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 35016） | 已核对 |
| Linalool | 欧盟香料致敏原 | ✅ 通过 | 法规 1223/2009 合并版附录 III（docs/sources/eu_1223_2009_consolidated.pdf）条目 84，Common Ingredients Glossary 名称为 Linalool | 已核对 |
| Linalyl Acetate | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 77311） | 已核对 |
| Melaleuca Alternifolia Leaf Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 102660） | 已核对 |
| Mentha Arvensis Leaf Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 57860） | 已核对 |
| Mentha Piperita Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 84257） | 已核对 |
| Methylchloroisothiazolinone | 致敏防腐剂 | ✅ 通过 | CosIng 登记功能含防腐（PRESERVATIVE），"致敏"有文献出处（见 sources）（CosIng 35333） | 已核对 |
| Methylisothiazolinone | 致敏防腐剂 | ✅ 通过 | CosIng 登记功能含防腐（PRESERVATIVE），"致敏"有文献出处（见 sources）（CosIng 35341） | 已核对 |
| Ocimum Basilicum Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 35576） | 已核对 |
| Phytic Acid | 螯合剂 | ✅ 通过 | CosIng 登记功能含螯合（CHELATING）（CosIng 36555） | 已核对 |
| Pinene | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 90064） | 已核对 |
| Rosmarinus Officinalis Leaf Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 79866） | 已核对 |
| Sodium Laureth Sulfate | 强清洁力表活 | ✅ 通过 | CosIng 登记功能含清洁型表活（SURFACTANT - CLEANSING），"强清洁力"有文献出处（见 sources）（CosIng 79583） | 已核对 |
| Sodium Lauryl Sulfate | 强清洁力表活 | ✅ 通过 | CosIng 登记功能含清洁型表活（SURFACTANT - CLEANSING），"强清洁力"有文献出处（见 sources）（CosIng 37946） | 已核对 |
| Sodium Phytate | 螯合剂 | ✅ 通过 | CosIng 登记功能含螯合（CHELATING）（CosIng 79995） | 已核对 |
| Terpineol | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 80711） | 已核对 |
| Terpinolene | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 41511） | 已核对 |
| Tetramethyl Acetyloctahydronaphthalenes | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 40504） | 已核对 |
| Tetrasodium EDTA | 螯合剂 | ✅ 通过 | CosIng 登记功能含螯合（CHELATING）（CosIng 38569） | 已核对 |
| Tetrasodium Glutamate Diacetate | 螯合剂 | ✅ 通过 | CosIng 登记功能含螯合（CHELATING）（CosIng 84400） | 已核对 |
| Tetrasodium Iminodisuccinate | 螯合剂 | ✅ 通过 | CosIng 登记功能含螯合（CHELATING）（CosIng 60284） | 已核对 |
| Trisodium Ethylenediamine Disuccinate | 螯合剂 | ✅ 通过 | CosIng 登记功能含螯合（CHELATING）（CosIng 59889） | 已核对 |
| Turpentine | 加香成分 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING）（CosIng 41521） | 已核对 |
| Zingiber Officinale Root Oil | 精油 | ✅ 通过 | CosIng 登记功能含香料（PERFUMING），INCI 名为植物油（CosIng 60317） | 已核对 |
