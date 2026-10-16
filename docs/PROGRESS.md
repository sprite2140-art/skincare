# 进度与交接记录

每次开发对话结束前，由当前 AI 在“记录”顶部追加一条：做了什么、做到哪、下一步、遇到的问题。

## 模块分工

| 模块 | 负责 |
|---|---|
| 架构、数据格式、打分规则、搭配冲突规则 | Claude |
| 产品成分数据整理、中英文文案 | ChatGPT |
| 页面代码 | 按页面分配，一个页面只由一方负责 |
| 代码审查 | 交叉 |

## 记录

### 2026-10-16（Claude Code：落实作者对 4 个待定问题的决定）
- 完成：
  1. **预算**：价格档按品类设定，以 USD 为准（`src/scoring/config.ts` 的 `PRICE_TIERS_USD`）。洗发水：经济 < 12、中档 12–30（含两端）、高端 > 30。产品存当地价格，按新增的 `data/exchange_rates.csv` 固定汇率换算成 USD 后归档，展示仍用当地货币。数据校验会检查产品的币种是否在汇率表中。删除了原先按币种分别设定的占位价格线。
  2. **刺激风险**：致敏成分继续计入。冲洗型品类（cleanser、shampoo、conditioner、hair_mask、body_wash、body_scrub）扣分减半，可以和敏感用户加倍叠加。确认"想避开的成分 / 成分类型"都走硬性过滤直接排除，并补了测试。
  3. **新增 targets**：scalp_redness、tangling、color_fade，已同步到 DATA_SCHEMA.md 和问卷映射。新增头发问卷映射。新增就医提示：头皮屑"伴红斑、反复不好"；另按 PRODUCT.md 问卷，掉发"短期大量或成片脱落"也触发。
  4. **部署**：改为 Cloudflare Pages（Git 集成），步骤写在新文档 `docs/DEPLOY.md`，含 PR 预览。新增 `.node-version`（22）。路由从 HashRouter 改为 BrowserRouter（正常网址，便于分享链接），Vite 的 base 改为 `/`。
  - 新增品类编号列表（DATA_SCHEMA.md），products.csv 的 category 按此校验。
  - 测试 45 个，全部通过；类型检查、数据校验、构建均通过。
- 做到哪：打分逻辑已按作者决定更新；Cloudflare 项目还没创建，需作者在后台操作。
- 下一步：同上一条（整理洗发水数据并核对、做问卷和结果页、平价替代、天气接口）。
- 待作者：
  - 按 `docs/DEPLOY.md` 在 Cloudflare 后台连接仓库，并开启 PR 预览。
  - **核对汇率**：`data/exchange_rates.csv` 里 JPY、KRW、CNY 的数值是我填的近似值，没有来源，请核对后补上 source。
  - 知悉：预算档是上限，高端没有上限，所以用户选"高端"等同于"不限"。如果希望"高端"有别的含义请告诉我。
  - 卸妆、去角质有免洗型产品，暂按免洗处理（不减半）。如需按单个产品区分，可以在 products.csv 加一列。

### 2026-10-15（Claude Code：项目框架 + 打分逻辑）
- 完成：
  - 文件从 `skincare/` 子目录移到仓库根目录。
  - 搭建 Vite + React + TypeScript 项目：构建时直接读取 `data/*.csv`（papaparse）；中英文字典（`src/i18n`）；HashRouter；首页目前只是占位页。CI（GitHub Actions）依次运行类型检查、数据校验、测试和构建。
  - 数据层：CSV 解析（`src/data/parse.ts`）；成分名匹配，忽略大小写并使用别名；数据校验脚本 `npm run validate-data`，检查枚举、verified 必填项，并按出现次数列出产品中不在成分库的成分（即扩充优先清单）。
  - 打分逻辑 `src/scoring/score.ts`，规则写在新文档 `docs/SCORING.md`：硬性过滤、四维加权（缺数据的维度剔除后重新归一化）、搭配冲突、孕期被动提示、排序。打分只用 verified 成分；安全相关的检查也看 draft 成分，并标注"未核对"。
  - 用户档案本地存储（`src/profile/storage.ts`，带版本号，支持多份档案）；头皮问卷到打分输入的映射。
  - 数据格式新增（已写入 DATA_SCHEMA.md）：risk_tags 增加 `strong_cleanser`、`rx_caution`；conflicts_with 支持 `:severe`；螯合剂在 functions 中写 `chelating`。
  - 测试 36 个，全部通过。其中用 data/ 示例数据的测试验证了：draft 成分不参与打分，示例产品无法评分，"5 个成分暂无数据"分为不在库 2 个、未核对 3 个。算法测试使用测试文件内的 verified 数据，以 Test 开头的成分是虚构的，没有写入 data/。
- 做到哪：打分逻辑可用，但 data/ 里还没有 verified 成分，网页上看不到任何分数。
- 下一步：
  1. （ChatGPT）整理约 20 个洗发水产品和相关成分，核对后把成分标为 verified；整理后运行 `npm run validate-data`。
  2. 页面：头皮问卷 → 洗发水推荐结果页（调用 `rankProducts`），以及点击成分查看解释。
  3. 平价替代（核心成分相似度）和天气接口（Open-Meteo）都还没做。
- 待作者决定：
  - 预算价格线：`src/scoring/config.ts` 里的 `BUDGET_LIMITS` 目前是占位值。
  - sensitizer 是否计入刺激风险：目前计入。
  - 头皮"发红"、头发"打结 / 褪色"是否要新增 targets 取值。
  - 部署平台：GitHub Pages 或 Cloudflare Pages。

### 2026-10-15
- 完成：产品文档更新为开发说明；建立仓库结构和数据格式（data/ 下三个表格各含一行示例，均为 draft，未核对）。
- 下一步：整理约 20 个洗发水产品和相关成分；写打分逻辑。
- 待用户：创建 GitHub 仓库并上传这些文件，连接 Claude Code。
