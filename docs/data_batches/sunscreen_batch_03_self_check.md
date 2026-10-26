# su_batch3_self_check.md

## 1. 数量与编号
- 10 款，SU-US-041–050，编号连续。
- 已与 SU-US-001–040 做人工去重；SU-US-046 是 Shiseido Urban Environment Oil-Control SPF 40，不是已有 SU-US-020 Ultimate Sun Protector Lotion SPF 60+。

## 2. 表头
- products.csv：50 列，沿用项目模板，列名与顺序未改。
- purchase_links.csv / retail_ratings.csv：沿用项目固定表头。

## 3. 成分表与版本
- SU-US-041、043–045、047–050：取得单一来源完整 INCI；未拼接不同版本。
- SU-US-042：Kiehl's 官方页面本次未展开完整 INCI，因此 inci_list 留空，transparency=low；没有猜测防晒剂浓度。
- SU-US-046：采用 Shiseido 当前美国版官方成分/Drug Facts 数据。
- SU-US-048：品牌页面可读 INCI 中存在原页面拼写异常，按来源保留，未自行修正。

## 4. 品牌宣称与覆盖
- claimed_benefits 均只按品牌官方页面明确文案映射，最多 1–3 项。
- pigmentation：SU-US-041、042、043，共 3 款。
- pores：SU-US-049、050，共 2 款。
- redness：SU-US-045、047、048；其中 $30 内为 SU-US-047 ($15.94) 与 SU-US-048 ($25)。
- 明确 fragrance-free：SU-US-041、042、047、048。

## 5. 价格与规格
- >$50：SU-US-042 ($69)、044 ($55)、045 ($58)、046 ($52)，共 4 款。
- $30 内 redness：SU-US-047、048，共 2 款。
- SU-US-049 为净重 20 g，不换算 size_ml。
- 通用规则“每批至少 6 款 $15 以内”未达到；本批优先执行防晒补缺方向，不伪装成已达标。

## 6. 入库依据
- 评价数门槛只使用零售商商品页本身显示的数据；不使用第三方网站转述。
- SU-US-041、042、043、044、045、046、049：直接零售商 PDP 显示 >=1,000 reviews。
- SU-US-047：Walmart Best Sellers 页面直接列出该产品；商品 PDP 另行核对产品一致性。
- SU-US-048：Sephora 商品页对同一 Cicapair SPF 30 产品明确写 bestselling color corrector。
- SU-US-050：Sephora at Kohl's 直接 PDP 显示 1,006 reviews。

## 7. 平台字段限制
- 模板 platform 枚举没有 walmart / kohls。
- SU-US-047 的 Walmart 链接保留在 note/URL 中，没有新增表头。
- SU-US-050 为 Sephora at Kohl's，platform 记 sephora，并在 note 说明。

## 8. 待核对清单
- SU-US-042：完整 INCI 未取得。
- SU-US-048：品牌 INCI 原文存在多处疑似拼写异常，按来源保留。
- SU-US-050：不写具体 shade，使用 DailyMed 完整美国标签。

## 9. 未完成要求
- 本批没有满足“6 款 $15 以内”的通用价格规则。
- 其余本批防晒补缺要求已覆盖。
