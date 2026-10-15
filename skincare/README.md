# skincare（开发期内部名称）

一个免费、开源的护肤 / 头皮 / 头发产品推荐工具：根据你的状态、需求和所在城市，以成分为依据推荐具体产品，并解释每一项评分的原因。不接广告，不拿返佣，打分规则公开。

A free, open-source tool that recommends skincare, scalp and hair products based on ingredients, your needs and your city's climate — with every score explained. No ads, no affiliate links, open scoring rules.

## 仓库结构

- `data/ingredients.csv` 成分知识库
- `data/products.csv` 产品库（一行 = 一个产品在一个销售地区的配方）
- `data/cities.csv` 城市环境数据（水硬度等不常变化的属性）
- `docs/DATA_SCHEMA.md` 数据格式说明
- `docs/PROGRESS.md` 进度与交接记录（每次开发结束前更新）

## 当前阶段

v0.1：先用洗发水一个品类走通全流程。

## 许可

代码：MIT。作者整理的数据：CC BY 4.0。第三方数据按其原许可。
