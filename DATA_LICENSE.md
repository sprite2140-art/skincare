# 数据许可 / Data license

[LICENSE](LICENSE) 只适用于代码（MIT）。`data/` 下的数据按下面的规则授权。
The [LICENSE](LICENSE) file (MIT) covers the code only. Data in `data/` is licensed as follows.

## 作者整理的数据：CC BY 4.0

以下文件中由本项目作者整理、分类、撰写的内容，按 [知识共享署名 4.0 国际（CC BY 4.0）](https://creativecommons.org/licenses/by/4.0/) 授权。转载或改编时请注明出处（本项目名称和仓库链接）。

Content compiled, classified or written by the authors of this project in the files below is licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). Please credit this project (name and repository link) when you reuse or adapt it.

- `data/products.csv`（需求分类、配对关系、备注等；成分表和品牌宣称原文见下方"第三方内容"）
- `data/ingredients.csv`、`data/ingredient_explanations.csv`
- `data/chelators.csv`、`data/fragrance_ingredients.csv`
- `data/cities.csv`、`data/water_hardness.csv`、`data/water_hardness_reference.csv`（整理与分级；数值来自各供水机构的公开报告，每条记录附来源）
- `data/retail_ratings.csv`、`data/purchase_links.csv`（整理与核对；评分数字来自零售商页面，每条附链接和日期）

## 第三方数据：按原来源条款

Third-party data follows the terms of its original source. Sources are credited below and in each record.

| 文件 / 内容 | 来源 | 条款 |
|---|---|---|
| `data/cosing_export_2026-10-17.csv`、`data/cosing_ingredients.csv` | 欧盟委员会 CosIng 数据库，https://ec.europa.eu/growth/tools-databases/cosing/ ，2026-10-17 获取 | © European Union。按欧盟委员会文件重用政策（Commission Decision 2011/833/EU）重用，须注明来源；本项目已转换格式，内容未改动 |
| `data/eu_fragrance_allergens.csv` | 欧盟化妆品法规（EC）No 1223/2009 附录 III | 欧盟法规文本，按 EUR-Lex 的重用条款，须注明来源 |
| `data/exchange_rates.csv` | 美联储 H.10 汇率，https://www.federalreserve.gov/releases/h10/current/ | 按美联储网站的使用条款 |
| 产品图片（`products.csv` 的 image_* 列） | Open Beauty Facts，每张图片的来源、许可和署名记录在对应行 | 目前全部为 CC BY-SA 3.0（https://creativecommons.org/licenses/by-sa/3.0/ ）。展示时保留署名和许可链接；修改图片须注明并以相同方式共享。图片许可不包括品牌商标 |
| 成分表原文、品牌宣称原文短摘（`products.csv` 的 inci_list_original、brand_claims_quote 等） | 各品牌产品页和包装 | 著作权归原权利人；本项目只为说明产品信息而引用并附来源链接 |
| 零售商评分 | Ulta、Sephora、Target、Amazon 等产品页 | 只作展示、附链接和核对日期；数字归原平台 |

如果你是权利人并对某项内容的使用有疑问，请在仓库中提 issue。
If you are a rights holder and have concerns about any content, please open an issue in the repository.
