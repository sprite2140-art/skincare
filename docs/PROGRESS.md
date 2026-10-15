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
