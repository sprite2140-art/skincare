# 护肤问卷与推荐规则草案（作者已确认）

**状态：作者已于 2026-10-20 确认第 8 节的决定，按本文实现。** 上线日 11 月 1 日（见第 9 节）。

本文写面部问卷、步骤与等级规则、与洗护不同的打分规则、搭配冲突清单，以及要加进成分库的字段。洗护已有的规则（硬性过滤、四个维度、"一项需求都没满足时最高为一般"、证据缺失按 C 级、测试模式、排序分组、产品卡片）都沿用，见 [SCORING.md](SCORING.md)。这里只写护肤新增或不同的部分。

**出处标注**：每条规则后面写出处。没有权威出处、属于常见做法的写"行业惯例"；属于本项目自己的设计选择的写"本项目设计"。

**出处核对方式**：本会话的环境打不开网页原文，只能用搜索结果核对。下面的 AAD 页面、FDA 页面和论文都按搜索返回的页面标题、摘要和引文核对过，但没有逐页打开全文。建议作者上线前抽查几条链接。

---

## 1. 总原则

| 原则 | 出处 |
|---|---|
| 基本顺序：洁面 → 功效 / 治疗产品 → 保湿和 / 或防晒 → 化妆。顺序影响产品效果 | AAD [Should I apply my skin care products in a certain order?](https://www.aad.org/public/everyday-care/skin-care-basics/care/apply-skin-care-certain-order) |
| 产品不是越多越好：同时用多种抗老产品可能刺激皮肤；基础是温和洁面、防晒、保湿；新产品一次只加一种 | AAD [How to maximize results from anti-aging skin care products](https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/maximize-anti-aging-products)、[How to select anti-aging skin care products](https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/selecting-anti-aging-products) |
| 每天防晒。Nambour 随机对照试验：每天用广谱防晒（SPF 15+）的一组，4.5 年后手背皮肤老化比"想用才用"组少 24%（相对比值 0.76，95% CI 0.59–0.98） | Hughes MCB, Williams GM, Baker P, Green AC. Sunscreen and prevention of skin aging: a randomized trial. *Ann Intern Med* 2013;158(11):781–790. [PMID 23732711](https://pubmed.ncbi.nlm.nih.gov/23732711/)，doi:10.7326/0003-4819-158-11-201306040-00002 |
| 防晒选 SPF 30 以上、广谱、防水；每 2 小时和游泳、出汗后补涂；阴天也要用 | AAD [How to select a sunscreen](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-select-sunscreen)、[How to apply sunscreen](https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-apply-sunscreen) |

**Nambour 试验核对结果**：
- 受试者：903 名 55 岁以下成人，来自昆士兰 Nambour 社区登记的随机样本。
- 设计：2×2 析因，"每天防晒 vs 想用才用" × "β-胡萝卜素 vs 安慰剂"。
- 结局指标：手背皮肤硅胶印模的微观纹理，评估者不知道分组。时间为 1992–1996 年。
- 可以用来支持："每天早上防晒，而不是想起来才用"。
- 不能用来支持："SPF 30"：试验用的是 SPF 15+，SPF 30 的门槛来自 AAD。
- 不能用来支持"面部"的结论：试验测的是手背。
- 不能用来支持"逆转已有老化"的结论。
- 页面上引用时只写"每天用防晒的人，皮肤老化更慢（随机对照试验，手背皮肤）"。

---

## 2. 问卷

一屏一题，单选题选完自动进入下一题，可以返回修改。除"想避开的成分"外都可以跳过。答案只存在用户设备上。题目是本项目自己的措辞。

### 2.1 建议的题目（6 屏，痘痘细问只在选了痘痘时出现）

| # | 题目 | 选项 | 出现条件 | 用于 | 出处 |
|---|---|---|---|---|---|
| F0 | 开头说明 | 一句话：按 AAD 的基础顺序，用最少、彼此兼容的步骤；每一步写明是否可选 | 始终 | — | AAD（见第 1 节） |
| F1 | 你的皮肤（一屏两问） | **肤质**：干 / 中性 / 混合（T 区油）/ 油 / 不确定<br>**容易敏感吗**：很少 / 换季或换产品时偶尔 / 经常（刺痛、发红、发痒） | 始终 | 肤质：只用于显示和同等级内排序（见 4.6），**不产生需求**。敏感选"经常"时刺激风险扣分加倍 | 肤质分类：AAD [How to pick the right moisturizer for your skin](https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer)；"不确定"附一句自测"洗完脸不涂东西，1 小时后的感觉"：行业惯例 |
| F2 | 最近最想改善什么？（最多 3 项，按重要程度排序） | 痘痘、闭口（acne）/ 出油（oil）/ 干燥、脱皮（dryness）/ 泛红（redness）/ 暗沉、色斑（pigmentation）/ 细纹、松弛（aging）/ 毛孔（pores）/ 没有明显困扰（互斥） | 始终 | **需求**：每个选项一个，排序权重 3 / 2 / 1（与洗护 `RANKED_CONCERN_WEIGHTS` 相同） | 需求代码见 DATA_SCHEMA.md |
| F2a | 痘痘大概是什么情况？ | 偶尔几颗 / 经常反复 / 大面积，或有疼痛的大包（**就医提示**） | F2 选了痘痘 | 只用于就医提示，不加权 | AAD [9 things to try when acne won't clear](https://www.aad.org/public/diseases/acne/diy/wont-clear)（这一页的具体措辞未核对）；就医提示措辞与洗护相同："建议找皮肤科医生看看" |
| F3 | 平常的习惯（一屏三问） | **化妆吗**：不化 / 偶尔 / 几乎每天<br>**每天在户外（阳光下）多久**：30 分钟以内 / 30 分钟到 2 小时 / 2 小时以上<br>**会出汗或游泳吗**：很少 / 有时运动出汗 / 经常运动或游泳 | 始终 | 化妆 → 晚上加"卸妆"提示（见 3.2）；选了痘痘又化妆 → 同等级内优先"不致痘"标注。户外 2 小时以上，或"有时 / 经常" → 防晒优先防水款，并显示补涂提醒 | 卸妆：AAD [I have acne! Is it okay to wear makeup?](https://www.aad.org/public/diseases/acne/causes/makeup)、[10 skin care habits that can worsen acne](https://www.aad.org/public/diseases/acne/skin-care/habits-stop)；防水和补涂：AAD How to select / apply a sunscreen；FDA 防水标注 40 / 80 分钟：[21 CFR 201.327](https://www.law.cornell.edu/cfr/text/21/201.327) |
| F4 | 预算 | 见 2.3 | 始终 | 硬性过滤 | 同洗护 |
| F5 | 有想避开的成分吗？ | 没有，跳过 / 香精 / 酒精 / 精油 / 搜索具体成分 | 始终（必答） | 硬性过滤；与洗护共用同一份答案 | 同洗护 |

城市沿用洗护的答案，用于判断市场；面部暂不用水硬度。护肤问卷不再单独问城市。

### 2.2 合并和删除了哪些题

| 候选题 | 处理 | 理由 |
|---|---|---|
| 肤质 | 保留，与"是否敏感"合为一屏（F1） | 两题都很短。肤质不产生需求（需求只来自 F2 的明确选择） |
| 面部困扰（最多 3 项，可排序） | 保留（F2） | 需求的唯一来源 |
| 是否敏感 | 并入 F1 | — |
| 是否在孕期或哺乳期 | **不放进问卷**，沿用档案页的"特殊状态"入口；结果页顶部加一行"孕期、哺乳或在用处方药？在档案里设置" | PRODUCT.md 规定特殊状态不进首次流程。安全兜底沿用现有做法：含孕期需注意成分的产品，对所有人被动提示 |
| 是否在用处方外用药或口服异维 A 酸 | 同上。档案的特殊状态需要从单选改为多选，并新增"口服异维 A 酸"（见第 8 节决定 3） | 同上 |
| 是否化妆 | 保留，与户外、出汗合为一屏（F3） | 第一阶段没有卸妆品类的数据，这题先只用于晚上的卸妆提示和"不致痘"排序 |
| 每天户外时间、是否运动出汗 | 并入 F3 | — |
| 是否介意防晒泛白 | **删除，改成结果页防晒一步上的开关**"隐藏可能泛白的未调色物理防晒"，默认关 | 只影响防晒，不影响其他步骤。放在结果页可以随时切换 |
| 想要几个步骤 | **删除，由困扰自动决定**，结果页提供"只看基础 3 步"开关（见 3.1） | 见下面的比较 |
| 预算 | 保留（F4） | — |

**步骤数量：两种方案比较**

| | A. 用户选：极简 / 标准 / 完整 | B. 由困扰自动决定（建议） |
|---|---|---|
| 题量 | 多一题 | 不加题 |
| 是否符合"只在选了对应困扰时加入步骤" | 不完全符合：没选困扰的人选了"完整"，也加不出步骤，"完整"等于"极简"，容易让人困惑 | 符合：每个可选步骤都对应用户选的一个困扰 |
| 用户能否少买 | 能 | 能：结果页有"只看基础 3 步"开关，每个可选步骤标"可选" |
| 符合 AAD "最少、彼此兼容的步骤" | 取决于用户怎么选 | 默认就是最少步骤 |

建议采用 B（本项目设计）。

### 2.3 预算

洗护的预算是按品类分别问。护肤最多 6 个品类，逐个问太多，建议一屏选一档，按品类显示金额（本项目设计）：

- 选项：`洁面 $15 以内 · 保湿 $X 以内 · 防晒 $Y 以内 …` / 第二档 / 第三档 / 不限 / 自填整套总预算。每档的金额是各品类自己价格的 25% / 50% / 75% 分位数（规则与洗护相同），只显示当前流程里出现的品类。
- 每档都包含更便宜的产品；不起名字，不用带评价意味的价格词。
- 选"自填整套总预算"时，搭配规则沿用洗护：先比适合等级，再比总分，同分取总价低的。
- 品类内有价格的产品少于 3 款时，这个品类只有"不限"，与洗护相同。

### 2.4 就医提示

- 触发条件：F2a 选了"大面积，或有疼痛的大包"。
- 措辞与洗护统一："……，建议找皮肤科医生看看。"不出现病名。
- 有提示时仍给出推荐。

---

## 3. 步骤和等级

### 3.1 步骤表

完整顺序（用于排序）：卸妆 → 洁面 → 化妆水 → 去角质 → 精华 / 功效 → 点涂 → 眼霜 → 保湿 → 面油 → 防晒；面膜为每周可选。第一阶段只推荐下表中的 6 个品类；化妆水、眼霜、面油、面膜、卸妆暂不推荐。

| 步骤 | 品类 | 早 / 晚 | 什么时候出现 | 页面标注 | 出处 |
|---|---|---|---|---|---|
| 洁面 | cleanser | 早晚 | 始终 | 基础 | AAD [How to control oily skin](https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin)、AAD 异维 A 酸护肤页（每天最多洗两次，出汗后洗） |
| 功效 / 精华 | serum | 按成分定早晚（见 3.3） | F2 选了泛红、暗沉色斑、细纹松弛、毛孔中的任一项 | 可选 | AAD 基本顺序（功效产品在洁面后）；各困扰对应的成分由成分库 targets 决定 |
| 点涂 | spot_treatment | 晚（含过氧化苯甲酰时按 3.3） | F2 选了痘痘 | 可选 | AAD 基本顺序；痘痘外用药：AAD 痤疮指南（Reynolds RV et al. *J Am Acad Dermatol* 2024;90(5):1006.e1–e30） |
| 去角质 | exfoliator | 晚，每周 1–2 次 | F2 选了毛孔、暗沉色斑或出油，且 F1 敏感不是"经常"，且不在用异维 A 酸或处方外用药 | 可选，每周 | AAD [How to safely exfoliate at home](https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home)（越强的去角质越少做；干、敏感、易长痘的皮肤宜温和；用 A 醇类或过氧化苯甲酰时去角质可能加重干燥）。"每周 1–2 次"：行业惯例 |
| 保湿 | moisturizer | 早晚 | 始终 | 基础 | AAD 基本顺序；AAD [Moisturizer: Why you may need it if you have acne](https://www.aad.org/public/diseases/acne/skin-care/moisturizer) |
| 防晒 | sunscreen | 早 | 始终 | 基础 | AAD How to select a sunscreen；Hughes 2013 |

**极简 / 标准 / 完整（由困扰自动得出）**：

- **极简（基础 3 步）**：洁面、保湿、早上防晒。没有选困扰，或打开"只看基础 3 步"时显示这一档。
- **标准**：极简 + 第一困扰对应的可选步骤。一个困扰可能对应两步：暗沉色斑、毛孔同时对应精华（每天）和去角质（每周 1–2 次，敏感肌和用处方药时不出现），出油对应去角质；这种情况两步都加入，仍算这一个困扰的一档，不再另选其中一步。多个困扰对应同一步骤时合并为一个产品（见下方上限）。
- **完整**：标准 + 第二、第三困扰对应的可选步骤。
- **上限**（本项目设计，依据 AAD "产品过多可能刺激"）：早上最多 1 个功效产品，晚上最多 1 个功效产品加 1 个点涂。多个困扰对应同一步骤时，合并为一个产品（同一款精华尽量覆盖多个困扰）。去角质只占每周 1–2 个晚上，那几晚不用 A 醇类（见第 5 节）。
- **只选了出油、干燥时**：不加步骤，只影响洁面、保湿、防晒的挑选。依据：AAD How to control oily skin、[Dermatologists' top tips for relieving dry skin](https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin)。

### 3.2 卸妆

第一阶段没有卸妆品类的数据。F3 选了化妆（偶尔或几乎每天）时，晚上流程开头显示一行提示："睡前把妆卸干净，用卸妆产品或温和洁面"，不推荐具体产品。出处：AAD 10 skin care habits that can worsen acne。

### 3.3 早晚分配

| 规则 | 出处 |
|---|---|
| A 醇类（retinol、retinal、adapalene 等）放晚上 | AAD [Retinoid or retinol?](https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol)（皮肤科医生常建议晚上用） |
| 维生素 C 放早上，洁面后、防晒前 | AAD [Dermatologist-recommended skin care for your 20s](https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-in-your-20s) |
| 果酸、水杨酸类去角质产品放晚上 | 行业惯例；FDA 指出果酸会增加日晒敏感，用药期间和停用后一周都要防晒：[Alpha Hydroxy Acids](https://www.fda.gov/cosmetics/cosmetic-ingredients/alpha-hydroxy-acids)、[Guidance for Industry: Labeling for Cosmetics Containing AHAs](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-labeling-cosmetics-containing-alpha-hydroxy-acids) |
| 过氧化苯甲酰与 A 醇类同时出现时，过氧化苯甲酰放早上、A 醇类放晚上 | 见第 5 节第 1 条 |
| 其他：产品的 `use_time`（品牌原文）优先；为 unknown 时按上面的成分规则；仍无法确定时放晚上（防晒除外） | 本项目设计 |

---

## 4. 打分：与洗护不同的地方

### 4.1 防晒的硬性条件

| 情况 | 处理 | 出处 |
|---|---|---|
| `spf` ≥ 30 且 `broad_spectrum = yes` | 可推荐 | AAD How to select a sunscreen |
| `spf` < 30，或 `broad_spectrum = no` | 排除，原因写"不符合 SPF 30 以上、广谱的建议" | 同上 |
| `spf` 为空，或 `broad_spectrum = unknown` | 不排除，也不推荐，放进"信息不全，无法确认"分组，写明缺哪一项 | 缺数据不应高于"证据弱"，也不应重罚（产品原则） |
| 防水 `water_resistance` | 不是硬性条件。F3 户外 2 小时以上，或出汗 / 游泳选"有时 / 经常"的用户：同等级内 40 / 80 排在前面；其他用户不按防水排序、不扣分。**所有用户**的防晒卡片都显示"防水 40 分钟 / 防水 80 分钟 / 未标注防水" | AAD 建议选防水款；FDA 21 CFR 201.327；作者决定（2026-10-20） |
| "隐藏可能泛白的未调色物理防晒"开关打开 | **按成分表事实筛选，不用"泛白"这类体验描述**：防晒剂只有氧化锌和 / 或二氧化钛、且成分表中没有氧化铁（CI 77491 / 77492 / 77499）的产品隐藏，页面写"已隐藏 N 款未调色的物理防晒"。卡片不写"会泛白" | 作者决定（2026-10-20）：没有可靠出处支持具体产品的泛白体验，只按成分表事实判断 |

**其他市场**：这些条件按美国标签（SPF、Broad Spectrum、FDA 40 / 80 分钟防水）写，第一阶段只有美国产品。导入日本、韩国、中国的防晒前，要先定好换算规则（如 PA 等级与广谱的对应、当地防水标注的对应），并写明出处；否则当地产品会被放进"信息不全"。

防晒的需求匹配：防晒只对出油、干燥、痘痘、暗沉色斑这几项需求计分（见 4.3）。没有选这几项时，防晒按温和度和价格排序，与洗护"没选需求时"的规则相同。

### 4.2 敏感肌

| 规则 | 出处 |
|---|---|
| F1 选"经常"：刺激风险扣分加倍（沿用 `SENSITIVE_MULTIPLIER = 2`）；免洗产品不减半，冲洗型（洁面）减半，沿用洗护 | 沿用 SCORING.md |
| 刺激成分：沿用 fragrance、essential_oil、alcohol、strong_acid、sensitizer 五个标签。另外，A 醇类、过氧化苯甲酰、果酸、水杨酸类**只对敏感肌**计入刺激风险（每类扣 15 分，敏感肌加倍后为 30 分）；对非敏感肌不扣分，因为它们是针对困扰的功效成分 | A 醇类和过氧化苯甲酰会让皮肤更敏感：AAD How to safely exfoliate at home；只对敏感肌计入：本项目设计（见第 8 节决定 5） |
| 敏感肌的去角质步骤不出现 | AAD How to safely exfoliate at home（干、敏感皮肤宜温和；有玫瑰痤疮的人不要去角质） |
| 敏感肌在同等级内优先"标注无香"的产品（沿用洗护的香味层级排序） | AAD [How to test skin care products](https://www.aad.org/public/everyday-care/skin-care-secrets/prevent-skin-problems/test-skin-care-products)（选 fragrance-free；"unscented"可能只是遮盖了气味） |

结果页对敏感肌显示一行："新产品先在小块皮肤试用 7–10 天"。出处同上。

**所有用户**：含 A 醇类、过氧化苯甲酰、果酸、水杨酸类的产品，卡片"需要注意"里显示"初次使用从低频开始（如隔天一次），白天需要防晒"（作者决定 2026-10-20；出处：AAD Retinoid or retinol?、AAD 痤疮页面关于过氧化苯甲酰从低浓度、隔天开始的建议、FDA AHA 指南）。

### 4.3 每一步只对相关的需求计分

洗护用"发丝效果分给护发素，权重 0.5"的办法分配需求。护肤每一步对应的需求不同：如果用全部需求给洁面打分，几乎所有洁面都会因为"不针对细纹"被压到"一般"。建议按下表分配（本项目设计）：

| 步骤 | 计分的需求（只算用户选了的） |
|---|---|
| 洁面 | acne、oil、dryness、redness |
| 保湿 | dryness、redness、oil、aging |
| 防晒 | oil、dryness、acne、pigmentation |
| 功效 / 精华 | 加入这一步的那个困扰（多个时都算） |
| 点涂 | acne |
| 去角质 | pores、pigmentation、oil |

- 一步里没有分到任何需求时，这一步不计需求分，按温和度和价格排序（沿用洗护"没选需求"的规则）。
- "一项需求都没满足时最高为一般"只按这一步分到的需求判断。

### 4.4 浓度

- 产品有 `active_concentrations`，且成分库有 `effective_range` 时：浓度在范围内按"主打成分"计（1）；低于范围按"非主打成分"计（0.3）；高于范围不加分，在"需要注意"里写明。
- 浓度或范围缺一项时，按现有主打成分规则处理，不扣分。
- 出处：PRODUCT.md "公开浓度且在有效范围内，得分更高"。具体的 1 / 0.3 沿用现有参数。

### 4.5 特殊状态（档案入口，硬性过滤）

| 状态 | 处理 | 出处 |
|---|---|---|
| 怀孕 / 备孕 / 哺乳 | 成分的 `pregnancy_note = avoid`（如 A 醇类、氢醌）→ 排除；`caution`（如 2% 以上水杨酸、过氧化苯甲酰）→ 不排除，卡片写"孕期请注意用量，告诉医生你在用什么" | AAD [Dermatologist-approved pregnancy skin care](https://www.aad.org/public/everyday-care/skin-care-secrets/routine/pregnancy-skin-care)、[Is any acne treatment safe to use during pregnancy?](https://www.aad.org/public/diseases/acne/derm-treat/pregnancy)；AAD 痤疮指南 2024（孕期优先选 A 醇类以外的外用药） |
| 在用处方外用药（如处方 A 酸） | 不出现去角质步骤；含 A 醇类、果酸、水杨酸类、过氧化苯甲酰的免洗产品排除，原因写"你在用处方外用药，叠加可能加重刺激，请按医生的方案"；沿用现有 `rx_caution` 排除 | AAD How to safely exfoliate at home |
| 口服异维 A 酸 | 同上，另外显示一行"按医生建议，用温和洁面、保湿和防晒" | AAD [Isotretinoin: The truth about safety, side effects, and skin care](https://www.aad.org/public/diseases/acne/derm-treat/isotretinoin/side-effects)（温和洁面、不致痘保湿、SPF 30+ 广谱防水防晒；谨慎使用 A 醇类、过氧化苯甲酰、果酸、水杨酸类） |

对所有人的被动提示沿用现有规则：含孕期需注意成分的产品显示"孕期或哺乳期请注意"。

### 4.6 只显示、不计分的字段

| 字段 | 用法 | 出处 |
|---|---|---|
| `skin_type_claim` | 卡片显示"品牌标注：适合油皮"。同等级内，与用户肤质一致的排前面 | 本项目设计；不计分是因为需求只来自明确选择 |
| `non_comedogenic_claim = yes` | 用户选了痘痘或出油时，同等级内排前面，卡片显示"品牌标注不致痘"；unknown 不扣分 | AAD How to control oily skin（选标"oil free""noncomedogenic"的产品） |
| `texture`、`use_frequency`、`face_step_note` | 卡片"怎么用"里显示品牌原文，不从成分推测 | 产品原则 |
| 零售商评分 | 只显示，沿用洗护 | 产品原则 |

---

## 5. 搭配冲突清单

**检查范围**：结果页整套流程中的所有产品，以及用户已在用的产品（第一阶段先不做搜索添加）。

**规则写法**：按成分类别写规则（类别清单是本项目维护的，见 6.2），再加上成分库里逐个成分的 `conflicts_with`。两种来源都显示，冲突提醒放在页面顶部。

| # | 组合 | 处理 | 严重程度 | 出处 |
|---|---|---|---|---|
| 1 | 过氧化苯甲酰 + A 醇类，同一时段（**阿达帕林除外**：同一研究测得阿达帕林稳定，FDA 也批准了阿达帕林 + 过氧化苯甲酰的复方凝胶 Epiduo，可以同时使用） | 过氧化苯甲酰放早上，A 醇类放晚上（3.3）；无法错开时提示"不要同时涂" | 一般（只提醒） | 实验室研究：过氧化苯甲酰加光照，约 2 小时降解 50% 以上的维 A 酸，24 小时降解 95%，阿达帕林稳定。Martin B et al. *Br J Dermatol* 1998;139 Suppl 52:8–11，[PMID 9990414](https://pubmed.ncbi.nlm.nih.gov/9990414/)。注意：这项研究测的是两种产品混合后的稳定性，不是皮肤上的效果；化妆品里的视黄醇同样怕氧化，按同样处理属于行业惯例 |
| 2 | A 醇类 + 去角质产品（果酸、水杨酸类、PHA、磨砂），同一晚 | 去角质的那晚不用 A 醇类 | 一般 | AAD How to safely exfoliate at home |
| 3 | 过氧化苯甲酰 + 去角质产品，同一时段 | 错开时段或错开日子 | 一般 | 同上 |
| 4 | 同一时段有两个以上的去角质产品（如果酸精华 + 水杨酸洁面 + 磨砂） | 只保留一个，其余换成不含这些成分的产品 | 一般 | AAD How to safely exfoliate at home（越强的去角质越少做）；"同时段最多一个"：行业惯例 |
| 5 | 同一时段有两个 A 醇类产品 | 只保留一个 | 一般 | AAD How to maximize results from anti-aging skin care products（同时用多种抗老产品可能刺激） |
| 6 | 流程里有光敏成分（果酸、A 醇类；以成分库 `photosensitizing = yes` 为准），但流程里没有防晒产品。防晒是基础步骤，用户不能关掉；这条只在防晒没有可选产品时出现（数据整理中，或"隐藏可能泛白的未调色物理防晒"开关打开后没有剩下的产品） | 页面顶部提醒"这套流程里有让皮肤更怕晒的成分，早上一定要防晒"；打开"只看基础 3 步"时防晒仍保留 | 一般 | FDA AHA 指南（停用后一周内仍需防晒） |
| 7 | 维生素 C（抗坏血酸）+ 过氧化苯甲酰，同一时段 | 错开早晚 | 一般 | 行业惯例（过氧化苯甲酰是氧化剂），没有找到权威出处 |
| 8 | 在用处方外用药或口服异维 A 酸 + A 醇类 / 果酸 / 水杨酸类 / 过氧化苯甲酰免洗产品 | 排除（4.5） | 严重（不推荐） | AAD 异维 A 酸页面；AAD How to safely exfoliate at home |

**不列入的常见说法**（没有找到可靠依据，列入会造成误报）：烟酰胺 + 维生素 C、维生素 C + 果酸、透明质酸 + 任何成分。成分库的 `conflicts_with` 如果写了这些组合，按那边给出的出处判断。

---

## 6. 成分库

### 6.1 ingredients.csv 新增的列

另一个 AI 交付的 CSV 列为：inci_name, name_zh, targets, evidence_level, effective_range, us_regulatory_status, pregnancy_note, photosensitizing, conflicts_with, key_sources, notes。其中 inci_name、name_zh、targets、evidence_level、effective_range、conflicts_with 已有同名列；key_sources 并入现有的 sources。新增 4 列：

| 新列 | 取值 | 用途 | 留空时 |
|---|---|---|---|
| us_regulatory_status | 成分在美国**可以**作为什么使用，不是某个产品的实际身份（产品是药品还是化妆品，取决于成品的用途和宣称，见 FDA [Is it a cosmetic, a drug, or both?](https://www.fda.gov/cosmetics/cosmetics-laws-regulations/it-cosmetic-drug-or-both-or-it-soap)）：`otc_drug_active`（可作为美国 OTC 药品活性成分，如防晒剂、水杨酸、过氧化苯甲酰、0.1% 阿达帕林）/ `rx_only`（只能处方）/ `cosmetic`（只作化妆品成分）/ `not_permitted_otc`（不能作为 OTC 销售，如氢醌）/ `unknown` | 成分弹窗写"可作为美国非处方药活性成分"这类说法，不给产品贴"药品"标签；`not_permitted_otc` 的产品在"需要注意"里写明 | 不显示 |
| pregnancy_note | `avoid` / `caution` / `no_known_concern` / `unknown` | 4.5 的孕期规则。只有 `avoid` 自动加上现有的 `pregnancy_caution` 标签（孕期排除）；`caution` 不加标签、不排除，只在卡片上提示。洗护的被动提示保持不变 | 按 unknown：不排除；如果是有效成分，卡片写"孕期资料暂缺" |
| photosensitizing | `yes` / `no` / `unknown` | 第 5 节第 6 条；卡片"怎么用"里写"用这款期间注意防晒" | 按 no；但果酸、A 醇类仍按 6.2 的类别清单提醒 |
| notes | 自由文本 | 只供核对，不显示 | — |

另一个 AI 的 CSV 可以直接合并：按 inci_name 匹配，成分库已有的行只填空白的格子，有冲突时列出来给作者决定，不自动覆盖。导入后 review_status 为 draft，出处写在 sources 里。

### 6.2 本项目维护的有效成分类别清单（新增 `data/face_active_classes.csv`）

冲突规则和敏感肌规则按类别判断，不按 CosIng 功能。做法与螯合剂清单、加香成分清单相同。列为 inci_name, active_class, source_url, added_on。

| active_class | 首批成分（INCI，最终以清单为准） |
|---|---|
| retinoid | Retinol, Retinal, Retinyl Palmitate, Hydroxypinacolone Retinoate, Adapalene |
| benzoyl_peroxide | Benzoyl Peroxide |
| aha | Glycolic Acid, Lactic Acid, Mandelic Acid |
| bha | Salicylic Acid, Capryloyl Salicylic Acid |
| pha | Gluconolactone, Lactobionic Acid（按温和去角质算，出处为"行业惯例"；参与第 5 节第 2–4 条，不算刺激成分，不算光敏。作者决定 2026-10-21） |
| vitamin_c | Ascorbic Acid（只这一种计入第 5 节第 7 条；衍生物不计） |
| sunscreen_mineral | Zinc Oxide, Titanium Dioxide, CI 77891（4.1 的"未调色物理防晒"开关） |
| iron_oxide | CI 77491, CI 77492, CI 77499（判断是否含色） |
| physical_exfoliant | 磨砂颗粒（如 Jojoba Esters 颗粒、Silica 颗粒）：成分表区分不了是否为颗粒，改用产品的 `face_step_note` 或品类判断，暂不列入 |

### 6.3 打分要用到的成分

需要另一个 AI 提供 targets、evidence_level、effective_range、pregnancy_note、photosensitizing 的成分，按需求列出。括号里是目前 40 款洁面中出现的款数，按产品里的实际 INCI 写法分别列出（匹配不会自动合并不同的 INCI 名，如透明质酸、水解透明质酸、乙酰化透明质酸钠是三个成分）。

| 需求 | 成分 |
|---|---|
| acne | Salicylic Acid (5), Benzoyl Peroxide (4), Adapalene, Azelaic Acid, Sulfur, Niacinamide (10) |
| oil | Niacinamide, Zinc PCA, Salicylic Acid, Kaolin (1), Bentonite |
| dryness | Glycerin (38), Sodium Hyaluronate (11), Hydrolyzed Hyaluronic Acid (4), Sodium Acetylated Hyaluronate (2), Hyaluronic Acid (0), Ceramide NP (12), Ceramide AP (5), Ceramide EOP (5), Cholesterol, Squalane (1), Urea, Petrolatum, Dimethicone, Panthenol (6) |
| redness | Azelaic Acid, Niacinamide, Centella Asiatica Extract (2), Madecassoside, Allantoin (4), Panthenol, Avena Sativa (Oat) Kernel Extract (2), Avena Sativa (Oat) Meal Extract (1), Avena Sativa Kernel Flour (0), Bisabolol (1) |
| pigmentation | Ascorbic Acid 及衍生物（Sodium Ascorbyl Phosphate, Ascorbyl Glucoside, 3-O-Ethyl Ascorbic Acid, Tetrahexyldecyl Ascorbate）, Niacinamide, Azelaic Acid, Tranexamic Acid, Alpha-Arbutin, Kojic Acid, Glycyrrhiza Glabra Root Extract, Glycolic Acid (2) |
| aging | Retinol, Retinal, Hydroxypinacolone Retinoate, Bakuchiol, Palmitoyl Pentapeptide-4, Ascorbic Acid, Niacinamide |
| pores | Salicylic Acid, Niacinamide, Retinoids, Glycolic Acid, Lactic Acid (3), Gluconolactone (4), Capryloyl Salicylic Acid (2) |
| 只用于安全和监管 | Hydroquinone（FDA：2020 年 CARES Act 后，美国没有合法销售的 OTC 美白产品：[FDA works to protect consumers from potentially harmful OTC skin lightening products](https://www.fda.gov/drugs/drug-safety-communications/fda-works-protect-consumers-potentially-harmful-otc-skin-lightening-products)）；美国获准的防晒剂（Avobenzone, Homosalate, Octisalate, Octocrylene, Oxybenzone, Octinoxate, Zinc Oxide, Titanium Dioxide 等），只需要 us_regulatory_status，不需要 targets |

### 6.4 缺少数据时怎么处理

| 缺什么 | 处理 |
|---|---|
| 成分不在成分库 | 沿用现有规则：不参与打分，显示"有 N 个成分暂无数据" |
| evidence_level 为空 | 按 C 级（40 分）计，写"暂无证据，按最低等级计"（现有 `MISSING_EVIDENCE_LEVEL`） |
| effective_range 为空 / 产品没公开浓度 | 不按浓度调整（4.4） |
| pregnancy_note 为空 | 按 unknown：不排除；有效成分写"孕期资料暂缺" |
| photosensitizing 为空 | 按 no，但类别清单上的果酸、A 醇类仍提醒 |
| conflicts_with 为空 | 只用第 5 节的类别规则 |
| 防晒 spf / broad_spectrum 为空 | "信息不全，无法确认"分组（4.1） |
| use_time 为 unknown | 按 3.3 的成分规则分早晚 |

---

## 7. 结果页

沿用洗护的 `ProductCard`、需求对照表、评分明细、在哪买、成分折叠，以及 [DESIGN_QA.md](DESIGN_QA.md) 的自查清单。截图矩阵加护肤案例（见 7.3）。

### 7.1 页面结构（从上到下）

1. **搭配检查结果**：一行结论，例如"这套流程没有发现冲突"，或"2 处需要注意"；展开后逐条列出：哪两款、为什么、怎么用（如"A 醇放晚上，过氧化苯甲酰放早上"），每条附出处链接。就医提示、敏感肌试用提示也放在这里，同样只显示一次。
2. **早 / 晚两个标签**：默认显示当前时段（早上 5 点到下午 5 点显示"早"，本项目设计）。每个标签内按 3.1 的顺序列出步骤。一个产品早晚都用（如洁面、保湿）时，两个标签都显示同一张卡片，只算一次价格。
3. **每一步**：标题行写"步骤名 · 基础 / 可选"和一句为什么有这一步（如"因为你选了暗沉色斑"）。下面是 1 张首选卡片（完整卡片）和 2 个备选（收起状态的卡片），可以把备选换成首选。去角质写"每周 1–2 次"。
4. **页面底部**：整套总价（每样产品只算一次）；开关"只看基础 3 步"、防晒一步上的"隐藏可能泛白的未调色物理防晒"；数据说明链接。

### 7.2 首选和备选怎么选

- 首选：这一步排序第一的产品（适合等级 → 香味层级（敏感肌或选了无香时）→ 同等级内的标注排序（4.6）→ 综合分）。
- 首选组合和第 5 节冲突时，在不改变适合等级的前提下换成下一款没有冲突的产品；换不了时保留首选，在页面顶部写明冲突和用法。
- 备选：同一步排第 2、第 3 的产品；没有时写"暂无其他符合条件的产品"，不放宽条件。
- 设了整套预算：沿用洗护搭配的组合规则。

### 7.3 设计自查新增案例（加入 `QA_CASES`）

| 编号 | 案例 |
|---|---|
| skin-minimal | 没有选困扰：基础 3 步 |
| skin-full | 选了痘痘、暗沉色斑、细纹（早晚流程、点涂、精华，冲突提示 1 条以上） |
| skin-sensitive | 敏感肌 + 泛红（没有去角质步骤，无香优先） |
| skin-sunscreen-missing | 防晒数据不全（"信息不全，无法确认"分组） |
| skin-rx | 档案选了口服异维 A 酸（排除和提示） |

---

## 8. 作者的决定（2026-10-20）

1. 步骤数量按困扰自动决定，保留"只看基础 3 步"开关。
2. 防晒泛白从问卷删除，改为结果页开关；开关按成分表事实筛选（4.1），文案"隐藏可能泛白的未调色物理防晒"。
3. 特殊状态改为多选，新增"口服异维 A 酸"；洗护的处理不变。
4. 防水不作为硬性条件：户外时间长或会出汗的用户优先推荐防水款；其他用户不扣分；卡片都显示是否防水。
5. A 醇类、过氧化苯甲酰、果酸、水杨酸类只对敏感肌计入刺激；所有用户的卡片都显示"初次使用从低频开始，白天需要防晒"。
6. 预算一屏选一档，各品类分别显示金额。
7. 面部成分的核对方式：另一个 AI 交付数据后，由负责质检的 AI 逐条核对出处，作者再抽查；两步都通过即为 verified，数据说明页写明核对方式。
8. 上线日为 11 月 1 日。各品类数据在 10/28 前陆续上传，每类至少 20 款。

## 9. 实现计划

开发顺序：问卷 → 单品打分 → 步骤 → 早晚流程 → 冲突检查 → 结果页，每完成一部分推送一次。

| 时间 | 内容 |
|---|---|
| 10/25 前 | 问卷 F0–F5、单品打分（4.1–4.6）、步骤规则、早晚流程；用洁面和占位数据开发 |
| 10/28 前 | 冲突检查、结果页（早晚标签、每步 1 + 2、顶部冲突检查）、设计自查；导入其他品类数据和面部成分 CSV |
| 10/29 | 关闭测试模式 |
| 10/30–31 | 根据试用反馈修改 |
| 11/1 | 上线 |
