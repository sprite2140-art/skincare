# skincare（开发期内部名称）

[English](README.en.md)

一个免费、开源的护肤 / 头皮 / 头发产品推荐工具：根据你的状态、需求和所在城市，以成分为依据推荐具体产品，并解释每一项评分的原因。不接广告，不拿返佣，打分规则公开。

A free, open-source tool that recommends skincare, scalp and hair products based on ingredients, your needs and your city's climate — with every score explained. No ads, no affiliate links, open scoring rules.

## 仓库结构

- `data/ingredients.csv` 成分知识库
- `data/products.csv` 产品库（一行 = 一个产品在一个销售地区的配方）
- `data/cities.csv` 城市列表；`data/water_hardness.csv` 各城市水硬度记录；`data/water_hardness_reference.csv` 参照城市
- `data/cosing_ingredients.csv` 欧盟 CosIng 成分清单（只用于展示）；`data/eu_fragrance_allergens.csv` 香料致敏原
- `data/chelators.csv`、`data/fragrance_ingredients.csv` 本项目维护的判断清单（螯合剂、加香成分）
- `data/ingredient_explanations.csv` 常见成分通俗解释（起草稿）
- `data/exchange_rates.csv` 固定汇率表（美联储 H.10，价格换算 USD 用）
- `docs/DATA_SCHEMA.md` 数据格式说明
- `docs/SCORING.md` 打分规则说明
- `docs/DEPLOY.md` 部署说明（Cloudflare Pages，含 PR 预览）
- `src/scoring/` 打分逻辑（固定规则，不调用 AI）
- `src/data/` CSV 解析与数据校验
- `src/profile/` 用户档案（只存在浏览器本地）
- `docs/COVERAGE.md` 数据覆盖表；`docs/INGREDIENT_REVIEW.md` 成分核对表（都由脚本生成）
- `docs/PROGRESS.md` 进度与交接记录（每次开发结束前更新）

## 本地开发

需要 Node.js 20 或以上版本。

```bash
npm install
npm run dev            # 本地预览
npm test               # 运行测试
npm run validate-data  # 检查 data/ 下的 CSV
npm run ingredient-frequency  # 成分出现频率（按统一后的名称合并），决定成分库整理顺序
npm run ingredient-review     # 生成 docs/INGREDIENT_REVIEW.md：影响打分的成分核对表
npm run import-cosing -- <文件>  # 从 CosIng 导出文件生成 data/cosing_ingredients.csv
npm run coverage      # 生成 docs/COVERAGE.md：各需求 × 预算档位的可推荐产品数（数据更新后重新运行）
npm run build          # 构建静态网页到 dist/
```

技术栈：Vite + React + TypeScript；数据在构建时从 `data/*.csv` 读入；用户档案只存在浏览器的 localStorage。

## 当前阶段

v0.1：头皮与头发（洗发水、护发素、洗护搭配），面向美国用户，中英文界面。正在做上线前的成分核对；`src/scoring/config.ts` 的 `TEST_MODE_DRAFT_SCORING` 上线前必须改为 false。免责声明与隐私说明见网站的 /about 页。

## 许可

- 代码：MIT，见 [LICENSE](LICENSE)。
- 作者整理的数据：CC BY 4.0；CosIng、欧盟法规、美联储汇率、Open Beauty Facts 图片等第三方数据按原来源条款并注明出处。详见 [DATA_LICENSE.md](DATA_LICENSE.md)。
