# 参与贡献 / Contributing

[English below](#english)

欢迎提 issue 和 PR。这个项目的核心是**公开、可核对的数据和固定的打分规则**，所以对数据来源的要求比对代码更严格。

## 先读这些

- [docs/SCORING.md](docs/SCORING.md)：洗护打分规则；[docs/SKIN_QUIZ_DRAFT.md](docs/SKIN_QUIZ_DRAFT.md)：护肤问卷与规则
- [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md)：`data/` 下每个 CSV 的字段说明
- [DATA_LICENSE.md](DATA_LICENSE.md)：数据许可和第三方来源条款

## 本地开发

需要 Node.js 22.12 或以上（与 `.node-version` 一致）。

```bash
npm install
npm run dev            # 本地预览
npm run typecheck      # 类型检查
npm run validate-data  # 检查 data/ 下的 CSV
npm test               # 运行测试
npm run build          # 构建
```

提交 PR 前请确认后四条都通过，CI 会跑同样的检查。

## 修改或新增数据

- **每条数据都要有来源链接。** 成分表优先用品牌官网或包装；功效证据用公开文献（PubMed 等）或权威机构（AAD、FDA、欧盟法规），并写明核对日期。
- **不要提交抓取零售网站的代码或批量抓取的数据。** 多数零售商条款禁止自动抓取。评分数字只作事实信息记录，附原页面链接和日期。
- **不要复制受版权保护的长段文字**（杂志文章、论文全文、图表）。用自己的话概括，附链接。品牌宣称只摘短句。
- **产品图片**只用许可明确允许再分发的来源（目前是 Open Beauty Facts），五个 image_* 字段都要填。
- 改完数据后运行 `npm run validate-data`，确保 0 错误；如果影响覆盖表或成分核对表，再运行 `npm run coverage`、`npm run ingredient-review` 并一起提交生成的文件。
- 打分规则或权重的改动，请同时更新对应的说明文档和测试。

## 医疗相关内容

本项目只做"评估"和"建议"，不做诊断。请不要在页面文案或数据里写病名诊断、治疗承诺，或把化妆品说成药品。

## 发现错误？

- 数据有误（成分表、价格、链接、证据等级）：用"数据纠错"模板提 issue，附上正确来源。
- 你是权利人，对某项内容的使用有疑问：用"权利人问题"模板提 issue。
- 安全问题：见 [SECURITY.md](SECURITY.md)，不要公开提 issue。

提交的贡献按仓库许可授权：代码按 MIT，数据按 [DATA_LICENSE.md](DATA_LICENSE.md)。

---

## English

Issues and pull requests are welcome. The core of this project is **public, verifiable data and fixed scoring rules**, so data sourcing matters even more than code. Most documentation is in Chinese; feel free to write issues and PRs in English.

**Development.** Node.js 22.12+. Before opening a PR, make sure `npm run typecheck`, `npm run validate-data`, `npm test` and `npm run build` all pass; CI runs the same checks.

**Data rules.**

- Every record needs a source link and a check date. Prefer brand pages or packaging for ingredient lists, and published literature or authorities (AAD, FDA, EU regulations) for evidence.
- Do not submit scrapers or bulk-scraped retailer data; most retailers' terms forbid it. Ratings are recorded as facts with a link and date.
- Do not copy long copyrighted text. Summarize in your own words and link. Quote brand claims only briefly.
- Product images must come from sources whose license allows redistribution (currently Open Beauty Facts), with all five `image_*` fields filled in.
- After editing data, run `npm run validate-data` (0 errors). Regenerate `docs/COVERAGE.md` and `docs/INGREDIENT_REVIEW.md` with `npm run coverage` and `npm run ingredient-review` if they change.
- Changes to scoring rules or weights should update the docs and tests too.

**Medical content.** The site evaluates and suggests; it does not diagnose. Do not name diseases as diagnoses, promise treatment, or describe cosmetics as drugs.

**Reporting problems.** Use the issue templates for data corrections and rights-holder concerns. Report security issues as described in [SECURITY.md](SECURITY.md), not in a public issue.

Contributions are licensed under the repository's terms: code under MIT, data under [DATA_LICENSE.md](DATA_LICENSE.md).
