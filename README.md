# skincare（开发期内部名称）

一个免费、开源的护肤 / 头皮 / 头发产品推荐工具：根据你的状态、需求和所在城市，以成分为依据推荐具体产品，并解释每一项评分的原因。不接广告，不拿返佣，打分规则公开。

A free, open-source tool that recommends skincare, scalp and hair products based on ingredients, your needs and your city's climate — with every score explained. No ads, no affiliate links, open scoring rules.

## 仓库结构

- `data/ingredients.csv` 成分知识库
- `data/products.csv` 产品库（一行 = 一个产品在一个销售地区的配方）
- `data/cities.csv` 城市环境数据（水硬度等不常变化的属性）
- `data/exchange_rates.csv` 固定汇率表（美联储 H.10，价格换算 USD 用）
- `docs/DATA_SCHEMA.md` 数据格式说明
- `docs/SCORING.md` 打分规则说明
- `docs/DEPLOY.md` 部署说明（Cloudflare Pages，含 PR 预览）
- `src/scoring/` 打分逻辑（固定规则，不调用 AI）
- `src/data/` CSV 解析与数据校验
- `src/profile/` 用户档案（只存在浏览器本地）
- `docs/PROGRESS.md` 进度与交接记录（每次开发结束前更新）

## 本地开发

需要 Node.js 20 或以上版本。

```bash
npm install
npm run dev            # 本地预览
npm test               # 运行测试
npm run validate-data  # 检查 data/ 下的 CSV
npm run ingredient-frequency  # 成分出现频率（按统一后的名称合并），决定成分库整理顺序
npm run ingredient-review     # 生成 docs/INGREDIENT_REVIEW.md：待核对的有效成分和风险成分清单
npm run build          # 构建静态网页到 dist/
```

技术栈：Vite + React + TypeScript；数据在构建时从 `data/*.csv` 读入；用户档案只存在浏览器的 localStorage。

## 当前阶段

v0.1：先用洗发水一个品类走通全流程。

## 许可

代码：MIT。作者整理的数据：CC BY 4.0。第三方数据按其原许可。
