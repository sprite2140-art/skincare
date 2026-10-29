# 本次洗护新增与修正自查

## 1. 数量与编号

新增 SH-US-081–084 共4款，修正 SH-US-076、078、CO-US-055、056、057 共5行。对照原107款（97款美国版）及已验收洗护40款，以品牌和名称标准化去重，新增重复为0。新款均为一般/成人洗护系列，没有婴儿或儿童专用款。

SH-US-062、065、070、074 不进成人推荐。以单独排除映射记录，未重发这4条旧产品行。CO-US-040 核对正确，不在修正文件中。

## 2. 表头与文件格式

两个 products 文件均使用原模板50列，顺序一致，末10列全部为空。purchase_links 为6列，retail_ratings 为9列。UTF-8 BOM、英文逗号、引号转义和逐行列数检查；9条产品均为US、rinse_off。没有把非产品说明插入50列数据。

## 3. 单一完整成分来源

| 编号 | 项数 | 唯一完整成分来源 |
|---|---:|---|
| SH-US-081 | 8 | [DHS品牌页](https://personandcovey.com/collections/psoriasis/products/dhs-sal-shampoo) |
| SH-US-082 | 19 | [Tree To Tub品牌页](https://treetotub.com/products/ultra-gentle-unscented-shampoo-for-sensitive-scalp) |
| SH-US-083 | 22 | [Odele品牌页](https://odelebeauty.com/products/ultra-sensitive-shampoo) |
| SH-US-084 | 34 | [Hairstory品牌页](https://hairstory.com/products/new-wash-fragrance-free-8oz-bottle) |

DHS同一品牌页含3%水杨酸及全部7项非活性成分；INCI先列活性成分，浓度放key_actives，末10列仍留空。DHS、Hairstory 与直接零售商完整列表对照相符。Tree To Tub官网19项，Ulta20项含Potassium Sorbate且排序不同；Odele植物名称写法不同，均标retail_mismatch，只用品牌完整表，不拼接。

5条修正记录保留原已验收单一品牌INCI。Bumble和Oribe的retail_mismatch状态保留，未借改规格合并配方。完整来源链接列在各自source_url。

## 4. 品牌宣称与无香

4款新增均有品牌页明确fragrance-free宣称，未从不含Parfum推导。功效采用原枚举；最多2项，品牌短摘录与标签逐款核对。Odele只计敏感头皮，未推断头皮干。

Hairstory的无香是品牌“Fragrance-Free/zero added fragrance”定位；其完整INCI仍含Peppermint Oil、Rose Flower Water和Lavender Flower Extract，原样保留。没有将其表述为无精油或无全部芳香植物成分。它是清洁兼护发的co-wash，不冒称普通起泡洗发水。

## 5. 价格与规格

DHS采用品牌单瓶常规价$10.81，Amazon仅作评价入库依据；Odele $11.99、Hairstory 8oz常规瓶$48。Tree To Tub的Ulta常规价为$26.65，页面促销价$19.99未当常规价；品牌页售罄，直接零售商页面可售。

四款Bumble常规瓶价格$36/$38；3瓶8.5fl oz换算251mL，Invisible Oil护发素6.7fl oz换算198mL。不是1L，不是旅游装。Oribe标准瓶6.8oz/$59保持，SKU与关联依据改正。参考体积未明示mL或fl oz的新款及Oribe，size_ml保留空值。

## 6. 覆盖与直接入库依据

| 方向 | 新增编号 | 无香数 |
|---|---|---:|
| dandruff | SH-US-081 | 1 |
| dry_scalp | SH-US-082、084 | 2 |
| sensitive_scalp | SH-US-082、083、084 | 3 |

DHS用[Amazon直接商品页](https://www.amazon.com/dp/B000RYYI66)4.5分、1,382条评价，达到1,000。另3款用[Ulta无香洗发分类、Best Sellers排序](https://www.ulta.com/shop/hair/shampoo-conditioner/shampoo?preference=fragrance+free&sort=best_sellers)实际主商品卡，逐一卡片链接与同SKU商品页核对。不是全站总榜；Tree/Odele各149条、Hairstory仅1条，未假称达到1,000。未用推荐轮播、商品介绍的bestselling或第三方评价转述入库。

CO-US-056改用[Oribe自己的Nordstrom商品页](https://www.nordstrom.com/s/gold-lust-repair-restore-conditioner-for-damaged-hair/4513787)4.6分、2,970条评价，不再用Living Proof的Ulta卡。四款Bumble保留此前通过的真实Ulta分类Best Sellers依据，评分与购买链接对应Nordstrom同产品家族。所有评分均注明可能跨规格共享，未冒称单规格独立评价。

本补丁不新增高价配额。四款Bumble改常规瓶后均低于$50，原整批高价覆盖统计应随新价格重算，不能沿用1L旧统计；其余已验收覆盖不在本次重交范围。

## 7. 核对与空值

新4款INCI项数8/19/22/34；与107款及已验收40款无品牌名称重复。关联CSV均指向本包9个编号，主购买链接均有配套行。Bumble两组双向配对保留；Oribe配对沿用已验收SH-US-077，不重复附带其未改行。

图片及授权、未核实的体积、tested_claims等留空；没有用零或猜测替代未知。评分与来源采集日期为2026-10-27；部分规格UI复核为10月29日，记录在README。

## 8. 交付范围与局限

本次4款成人补位、4款Bumble常规规格和1款Oribe关联纠错均已写入交付文件。网站推荐规则需应用排除映射，并按README替换5个修正编号的旧关联行。未直接修改网站仓库或删除历史产品。未重复打包以前交付的护肤及洗护整批。

仍未核实的mL保持空值；零售商与官网成分差异保持明确标记。此前整批计划中的其他覆盖缺口未在本次扩大处理，也未声称本补丁解决全部历史配额。
