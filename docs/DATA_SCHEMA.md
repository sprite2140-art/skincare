# 数据格式说明

所有数据为 CSV（UTF-8）。多个值用分号 `;` 分隔。参与打分的成分：`review_status = verified` 的成分，以及基础成分（`category = base`，不需要人工核对）。开发测试阶段可以打开测试模式，让 draft 成分也参与打分（见 SCORING.md）。

## ingredients.csv（成分知识库）

| 字段 | 含义 | 示例 |
|---|---|---|
| inci_name | INCI 英文名（主键） | Piroctone Olamine |
| name_zh | 中文标准名 | 吡罗克酮乙醇胺盐 |
| aliases | 别名，匹配产品成分表时与 inci_name 一起查（忽略大小写和括号内俗名）。同一成分的不同写法都登记在这里，如 Aqua 的 Water、Sodium Lauroyl Methylalaninate 的 Sodium Lauroyl Methyl Alaninate | Octopirox |
| category | active / risk / base | active |
| functions | 功能（参考 CosIng，小写），只作说明。螯合剂的判断用 data/chelators.csv，不看这一列 | anti-dandruff;preservative |
| targets | 针对的困扰（取值见下） | dandruff;scalp_itch |
| effective_range | 有效浓度范围 | |
| max_limit | 法规限量 | |
| evidence_level | A / B / C | |
| risk_tags | 风险标签（取值见下） | |
| conflicts_with | 搭配冲突的成分，可在 INCI 名后加 `:severe` 标注严重冲突（严重冲突不推荐），不写视为 `mild`（只提醒） | Retinol:severe;Glycolic Acid |
| explain_zh | 中文通俗解释（一两句） | |
| explain_en | 英文通俗解释 | |
| sources | 来源链接 | |
| review_status | draft / verified | draft |
| reviewed_on | 核对日期 | |

targets 取值：

- 面部：acne, oil, dryness, redness, pigmentation, aging, pores
- 头皮：dandruff, scalp_oil, scalp_itch, scalp_redness, hair_loss
- 头发：damage, frizz, flat_hair, tangling, color_fade
- 头皮状态与发丝效果：dry_scalp（头皮干）, sensitive_scalp（敏感头皮）, clarifying（清爽洁净）, buildup（产品残留，只来自问卷：常用造型产品的用户）, shine（光泽）, curl_definition（卷度）, tone_yellow（去黄）, tone_orange（去橙）。去黄和去橙分开记录（原 tone_correction 已拆分）。目前主要来自品牌宣称（products.csv 的 claimed_benefits）；clarifying 也按成分功能辅助匹配（functions 含 chelating 的成分）

risk_tags 取值：fragrance, essential_oil, alcohol, strong_acid, sensitizer, strong_cleanser, pregnancy_caution, rx_caution

- fragrance / essential_oil / alcohol / strong_acid / sensitizer：计入刺激风险
- strong_cleanser：强清洁力表活，只对每天洗头的用户计入刺激风险
- pregnancy_caution：孕期需注意。不计入刺激风险；对怀孕 / 备孕 / 哺乳用户排除，对其他人被动提示
- rx_caution：与处方皮肤药需注意。对"正在用处方皮肤药"的用户排除

verified 成分必须填写 sources 和 reviewed_on（YYYY-MM-DD）；有 targets 的 verified 有效成分必须填写 evidence_level。`npm run validate-data` 会检查。

## products.csv（产品库）

| 字段 | 含义 | 示例 |
|---|---|---|
| product_id | 唯一编号：品类-地区-序号。面部品类的前缀见下方"面部产品"，序号 3 位，校验会检查 | SH-US-001 |
| brand | 品牌 | |
| name_en / name_zh | 产品名 | |
| zone | face / scalp / hair / body | scalp |
| category | 品类编号（取值见下） | shampoo |
| usage_type | 使用方式：rinse_off（冲洗型）/ leave_on（免洗型）。留空则用品类默认值；卸妆、去角质、面膜必须填写 | |
| subtype | 细分类型，普通产品留空。co_wash = 清洁型护发素：代替洗发水使用，category 必须为 shampoo（清洁步骤），页面显示"Co-wash · 清洁型护发素"标签和单独的使用说明，不能当作洗后护发素 | co_wash |
| region | US / JP / KR / CN | US |
| formula_note | 配方版本说明 | 美国版 |
| channels | 入库渠道 | Ulta |
| inclusion_basis | 入库依据（榜单/奖项），原文 | |
| inclusion_basis_type | 入库依据类型：retailer_bestseller（零售商畅销榜 / 按畅销排序，如 Ulta、Sephora、Walgreens）/ department_store_bestseller（百货 / 买手渠道畅销榜：Nordstrom、Neiman Marcus、Saks Fifth Avenue、Bergdorf Goodman、Bluemercury）/ beauty_award（美容大奖，如 Allure Best of Beauty、Cosmopolitan、NewBeauty）。可留空（依据待核验时）。**只决定产品能否入库，不参与打分。** 2026-10-19 按 inclusion_basis 原文回填：80 款 retailer_bestseller、18 款 beauty_award、9 款留空 | retailer_bestseller |
| awards | 榜单与奖项，结果页显示为标签。每项格式 `来源\|年份\|名称\|链接`，多项用分号分隔；来源和 4 位年份必填 | Allure Best of Beauty\|2025\|敏感肌洗护组合获奖\|https://… |
| claimed_benefits | 产品定位针对的困扰或效果，取 targets 的值，分号分隔。不从成分推断 | dandruff;sensitive_scalp |
| claim_source | claimed_benefits 的来源：brand_text（产品页的品牌原文）/ data_classification（资料整理时的分类）。页面分别显示"品牌宣称"和"资料分类"，都按产品定位 0.7 计分。本轮 47 款美国产品来自资料中的"需求"字段，是整理时的分类，全部填 data_classification；"日常清洁"对应 clarifying，"去黄 / 去橙"拆为 tone_yellow / tone_orange。2026-10-17 第 1 批扩充（20 款）的资料里 claim_source 写的是 brand_text，但资料说明写明 claimed_benefits 是项目的需求映射、不是品牌原话，导入时改为 data_classification；紫色洗发水（SH-US-057）的 tone_correction 记为 tone_yellow | data_classification |
| brand_claims / brand_claims_quote / brand_claims_source_url | 品牌产品页效果的中文概括、短原文和官方产品页。概括不是逐字翻译，也不是独立验证的效果；页面显示为"品牌宣称（产品页概括）"。目前只展示，不参与计分（计分仍用 claimed_benefits） | |
| brand_claim_targets | 品牌产品页明确宣称的效果对应的困扰，分号分隔，按下表从 brand_claims_quote（英文原文）和 brand_claims（中文概括）对应；计分时按"品牌宣称"0.7 计，与资料分类相同，页面标注"品牌宣称"。对应表：Moisturizing / Hydrating → dryness；Detangling → tangling；Smoothing / Frizz Control → frizz；Repair / Strengthening / Anti-breakage → damage；Volume / Body → flat_hair；Curl Definition → curl_definition；Neutralizes Yellow → tone_yellow，Orange / Brassiness（棕发）→ tone_orange，金发的 Brassiness → tone_yellow | dryness;tangling |
| brand_claims_status | brand_page_summary（brand_claims 是品牌页的中文概括）/ brand_page_quote（brand_claims 是品牌页英文原文摘录，与 brand_claims_quote 相同，页面只显示原文，不显示为"中文概括"）/ version_mismatch（在售版本与品牌页不一致，留空）/ not_collected（尚未收集）。brand_claims 有内容时必须为前两者之一并有出处。2026-10-17 第 1 批扩充（SH-US-048 起、CO-US-031 起）为 brand_page_quote | brand_page_summary |
| tested_claims | 可靠的成品测试（第三方或公开方法），每项格式 `困扰\|测试说明\|年份\|链接`，链接必填。目前没有数据 | |
| fragrance_free_claim | 产品是否明确标注 fragrance-free：yes / no / unknown。留空视为 unknown（未确认，不等于含香） | unknown |
| fragrance_free_source_url | 无香声明出处；fragrance_free_claim = yes 时必填 | |
| inci_list | 完整成分表，**英文 INCI 名**，按包装顺序，分号分隔。打分用这一列，解析时统一写法（见下方"成分名称统一"） | Aqua;Glycerin;Piroctone Olamine |
| key_actives | 品牌宣称的主打成分，**按品牌原文**保存（可带浓度、复数、复配物或技术名称，美国药品标签上的 Active Ingredient 也算），分号分隔。匹配规则见下方"主打成分匹配"。对应不上成分表的写法只作为品牌宣称展示，`validate-data` 给提示不报错。留空表示还没填写，暂按全部满分计算并提示；品牌没有单独公布时填 `Not separately disclosed`，所有有效成分按非主打计 | Pyrithione Zinc 1%; Ceramides |
| inci_list_original | 包装原文成分表（中文、日文、韩文等），原样保存，只用于展示和核对，不参与打分 | 水、甘油、吡罗克酮乙醇胺盐 |
| price / currency | 当地价格和货币代码，按销售地区存当地价格；price 必须为正数，currency 必须在 exchange_rates.csv 中 | 12 / USD |
| size_ml | 规格（毫升），正数，可留空。美国产品原始规格为 fl oz 时按 1 fl oz = 29.5735 ml 换算后取整，原文规格保留在 formula_note | 355 |
| available_in_cn | yes / cross_border / unknown | |
| transparency | high / medium / low | |
| source_url | 成分表来源链接，可有多个，用分号分隔 | https://a.example;https://b.example |
| purchase_url | 购买链接（零售商或品牌产品页）。本轮取 source_url 中与 channels 对应的零售商产品页 | https://www.ulta.com/p/… |
| paired_product_ids | 同系列的其他品类产品 ID，分号分隔，双向记录（洗发水记护发素、护发素记洗发水）。只用于显示"同系列"，不代表必须成套购买，搭配不限定同系列 | CO-US-001 |
| image_url / image_source / image_license / image_license_url / image_attribution | 产品图链接、来源记录页、许可名称、许可链接、署名。**五项都填写时页面才展示图片**（详情中显示署名、来源和许可链接），否则用按品类区分的占位图。优先使用 Open Beauty Facts 等开放授权来源；**不抓取零售商网站的图片**。目前 CO-US-005、CO-US-009 两张来自 Open Beauty Facts（CC BY-SA 3.0），可能是旧包装，不用于证明当前配方 | |
| reviewed_on | 核对日期 | |
| skin_type_claim … face_step_note | 面部属性，共 10 列，接在 reviewed_on 之后，见下方"面部产品" | |

### 面部产品（2026-10-19 起）

**品类与编号**：面部品类的 zone 必须为 face，product_id 前缀按品类：

| 前缀 | 品类 | category | usage_type 默认值 |
|---|---|---|---|
| CL | 洁面 | cleanser | rinse_off |
| MO | 保湿 | moisturizer | leave_on |
| SU | 防晒 | sunscreen | leave_on |
| SE | 精华 / 功效 | serum | leave_on |
| EX | 去角质 | exfoliator | 必须逐个填写 |
| ST | 点涂 | spot_treatment | leave_on |
| EY | 眼霜 | eye_cream | leave_on |
| FO | 面油 | face_oil | leave_on |
| MA | 面膜 | mask | 必须逐个填写 |

卸妆（makeup_remover）、化妆水（toner）暂不在第一阶段，前缀未定。

**当前数据**：美国洁面 40 款（CL-US-001—040，2026-10-19 导入，两批）。数据收集方的自查报告存在 `docs/data_batches/`。入库依据为 Ulta Face Wash 畅销排序的 34 款记为 retailer_bestseller，Nordstrom 畅销洁面专题的 6 款（CL-US-035—040）记为 department_store_bestseller。护肤还没有问卷和打分，面部产品不进入洗护结果页（`src/scoring/listProducts.ts`）。

**10 列面部属性**（products.csv 在 reviewed_on 之后，列名如下）。洗护产品和旧数据没有这些列或为空，不报错；空值按下表的默认值处理。体验和用法只填品牌原文，不从成分推测。

| 字段 | 取值 | 留空 |
|---|---|---|
| skin_type_claim | 品牌标注的适用肤质：oily / dry / combination / normal / sensitive / all，分号分隔 | 未标注 |
| texture | gel / lotion / cream / balm / oil / foam / liquid / stick | 未知 |
| spf | 正数，**只有 sunscreen 填写**（其他品类填了报错；防晒没填给提示） | 未知 |
| broad_spectrum | yes / no / unknown（广谱防晒标注，只用于防晒） | unknown |
| water_resistance | 40 / 80 / none / unknown（防水分钟数，只用于防晒） | unknown |
| active_concentrations | 品牌公开的有效成分浓度，每项 `INCI\|浓度\|链接`，分号分隔；三项都必填，浓度含数字（如 2%），链接为出处。INCI 在 inci_list 中找不到时给提示 | 未公开 |
| use_time | am / pm / both / unknown（品牌说明的使用时间） | unknown |
| use_frequency | 品牌原文的使用频率，如 "Use 2–3 times a week" | — |
| non_comedogenic_claim | yes / no / unknown；填 yes 时出处为 brand_claims_source_url（必填） | unknown |
| face_step_note | 品牌原文的使用步骤说明，如 "Apply after cleansing" | — |

**面部需求代码**：acne（痘痘）、oil（出油）、dryness（干燥）、redness（泛红）、pigmentation（色沉）、aging（初老）、pores（毛孔）。面部产品的 claimed_benefits、brand_claim_targets、tested_claims 只能用这些代码。

brand_claim_targets 对应表（面部）：

| 品牌原文 | 代码 |
|---|---|
| Hydrating / Moisturizing | dryness |
| Acne / Blemish / Breakouts | acne |
| Oil control / Mattifying | oil |
| Soothing / Calming / Redness | redness |
| Brightening / Dark spots | pigmentation |
| Anti-aging / Firming / Wrinkles | aging |
| Pores / Refining | pores |

原文（brand_claims_quote）出现这些说法、但 brand_claim_targets 没有对应代码时，`npm run validate-data` 给提示，由人工确认（代码 `src/data/face.ts` 的 FACE_CLAIM_KEYWORDS）。

### 主打成分匹配

key_actives 按品牌原文保存，打分时这样对应到成分表（代码 `src/data/keyActives.ts`，同义写法表在 `src/scoring/config.ts` 的 `KEY_ACTIVE_SYNONYMS`）：

1. 去掉浓度（`Pyrithione Zinc 1%` → `Pyrithione Zinc`），括号内的内容单独作为一个候选（`K18PEPTIDE (sh-Oligopeptide-78)` → 也查 `sh-Oligopeptide-78`）。
2. 与成分的 INCI 名或别名相同即匹配；以 INCI 名结尾也算（`Keratin` → `Hydrolyzed Keratin`）。
3. 复数写法匹配以单数开头的成分（`Ceramides` → `Ceramide NP`、`Ceramide AP`……）；单数写法不这样匹配（`Glycine` 不匹配 `Glycine Soja Oil`）。
4. 常见俗名按同义写法表对应 INCI（`Hyaluronic Acid` → `Sodium Hyaluronate`，`Tea Tree Oil` → `Melaleuca Alternifolia Leaf Oil`）。表中没有的复配物或技术名称（如 OLAPLEX Bond Building Technology）不匹配，只作为品牌宣称展示。

### 成分名称统一

解析 inci_list 时，对每个成分名做统一处理，再去成分库匹配：

1. **去掉括号内的俗名**：`Rosmarinus Officinalis (Rosemary) Leaf Extract` → `Rosmarinus Officinalis Leaf Extract`；`Aqua (Water)` → `Aqua`。半角、全角括号都处理。
2. **`[待核对]` 标记**：整理数据时拿不准成分名是否写对，可以在名称后加 `[待核对]`（半角、全角方括号都可以）。解析时去掉这个标记，并把该成分记为"名称未核对"：不参与打分，结果页显示为"暂无数据"。安全检查（特殊状态、想避开的成分、搭配冲突）仍会看它，并标注"未核对"。
3. **大小写、多余空格不影响匹配**：`AQUA` 与 `Aqua` 视为同一成分。
4. **拼写不同的写法不会自动合并**（如 `Methylalaninate` 和 `Methyl Alaninate`），要在 ingredients.csv 对应成分的 aliases 里登记，匹配时会同时查主名和别名。
5. **"INCI 名/俗名"写法**：整体查不到、且名称中有斜杠时，用斜杠前的部分再查一次（`Glycine Soja Oil/ Soybean Oil` → `Glycine Soja Oil`）。只取斜杠前的部分，本身带斜杠的 INCI 名（如 `Hippophae Rhamnoides Fruit/Seed Oil`）不会被拆错。
6. **成分频率统计**（`npm run ingredient-frequency`，以及 `npm run validate-data` 里的"不在成分库"清单）按统一后的名称合并计算：在库的成分按成分库主名合并（包括别名），不在库的按统一后的名称合并；同一产品里重复出现只算一次。

category 取值：

- 面部：makeup_remover（卸妆）, cleanser（洁面）, toner（化妆水）, serum（精华 / 功效）, moisturizer（保湿）, sunscreen（防晒）, exfoliator（去角质）, spot_treatment（点涂）, eye_cream（眼霜）, face_oil（面油）, mask（面膜）
- 头皮：shampoo（洗发水）, scalp_care（头皮护理）
- 头发：conditioner（护发素）, hair_mask（发膜）, leave_in（免洗护发乳）, hair_oil（护发油）。本轮页面实现洗发水和护发素；发膜、免洗护发乳、护发精油已预留品类和使用方式
- 身体：body_wash（沐浴露）, body_lotion（身体乳）, body_scrub（身体去角质）

usage_type 品类默认值（冲洗型产品的刺激风险扣分减半）。个别产品与默认不同时，在该产品行填写 usage_type 覆盖：

| 默认值 | 品类 |
|---|---|
| rinse_off | cleanser, shampoo, conditioner, hair_mask, body_wash, body_scrub |
| leave_on | toner, serum, moisturizer, sunscreen, spot_treatment, eye_cream, face_oil, scalp_care, leave_in, hair_oil, body_lotion |
| 无默认值，必须逐个填写 | makeup_remover, exfoliator, mask |

卸妆、去角质和面膜的填法：卸妆油、卸妆膏、磨砂膏、含酸洁面、需要洗掉的面膜填 rinse_off；卸妆水、酸类爽肤水和精华、免洗（睡眠）面膜填 leave_on。

### 预算价格上限（自动计算，不用手填）

预算题按品类分别提供三个价格上限和"不限"，上限由产品库价格自动算出：

1. 取该品类所有有价格的产品，用 exchange_rates.csv 把价格统一换算成 USD。
2. 三个上限为这些价格的 25% / 50% / 75% 分位数（四分位数），分位数用线性插值（与 Excel 的 PERCENTILE.INC 相同）。选项是"最高到这个价位"：每档包含更便宜的产品，等于上限的产品保留。
3. 有价格的产品少于 3 个的品类，暂不提供价格上限，只有"不限"。
4. 问卷选项显示为"$X 以内 / $Y 以内 / $Z 以内 / 不限"，换算成用户所在地货币（约数取整：1000 以上取整到百位，其余取整到个位）；筛选时用 USD 精确值比较。相邻上限原值相同时只保留一个；取整后显示相同但原值不同时改用不取整的金额。选项不起名字，问卷、结果页和代码注释里都不用带评价意味的价格词。
5. 超过上限的产品排除，原因写"超出你选的预算上限"。
6. 没有价格（或币种不在汇率表）的产品不参与分位数计算；选了任一上限时不显示它们，只在"不限"中出现。
7. 问卷也可以自填上限（单品），或在洗护搭配时"按整套"自填总预算；金额按用户所在地货币保存，比较时换算成 USD。没有符合条件的商品时页面明确提示，不自动放宽条件。
8. 每次产品数据或汇率更新后，上限在构建时自动重新计算；用户档案保存的是"第几个上限"（q1–q3），不是金额，所以不用重填。旧档案保存的 p33 / p67 和前一版的 q4 在读取时去掉，需要重新选择。`npm run validate-data` 会打印当前各品类的上限。

## cosing_ingredients.csv 与 eu_fragrance_allergens.csv（欧盟成分基础分类）

- **cosing_export_2026-10-17.csv**：原始数据，共 33,640 条。来源为欧盟委员会 CosIng 数据库（https://ec.europa.eu/growth/tools-databases/cosing/ ），由作者通过 CosIng 网站使用的公开数据接口于 **2026-10-17** 获取。列为 COSING Ref No、INCI name、CAS No、Function、Update Date。
- **cosing_ingredients.csv**：由上面的原始文件转换而来，列为 inci_name、functions（登记功能，小写，分号分隔）、cas_no、cosing_ref、update_date。不要手改：更新时下载新的导出文件，运行 `npm run import-cosing -- <文件>` 重新生成（脚本会自动找表头，逗号或分号分隔都可以），并更新本节的获取日期。
- **CosIng 匹配检查**：`npm run validate-data` 会列出产品成分表中在 CosIng 里找不到的成分名（成分库登记的别名也算找到，如美国写法 Fragrance 对应欧盟 Parfum），多数是拼写错误、拆分错误或美国色素名。美国色素名已在成分库登记为 CI 编号的别名（2026-10-18）：Yellow 5 = CI 19140、Blue 1 = CI 42090、Red 33 = CI 17200、Yellow 10 = CI 47005。
- **eu_fragrance_allergens.csv**：欧盟需标注的香料致敏原清单（inci_name、list、source）。目前收录法规 1223/2009 附录 III 的 26 种；2023/1545 号法规新增的条目待按法规原文补充。
- **合并规则**（`src/data/cosing.ts` 的 expandIngredients）：成分库 ingredients.csv 优先；成分库没有的成分用 CosIng 补充，来源标记为 CosIng、review_status 为 draft，category 为 base（基础分类，没有 targets）。打分仍按现有规则区分已核对和未核对。
- **CosIng 登记功能不参与判断**：只在成分弹窗中翻译显示（`cosingFunctions`）。只在 CosIng 中的成分 functions 为空。需要参与判断的功能用本项目维护的清单，见下面两节。
- **加香成分的判断**（`isFragrance`）：只有以下情况才算加香（risk_tags = fragrance）：
  - (a) 成分名为 Parfum / Fragrance / Aroma / Flavor；
  - (b) 在欧盟香料致敏原清单中；
  - (c) 在本项目的加香成分清单 data/fragrance_ingredients.csv 中；
  - (d) 精油（成分库 risk_tags = essential_oil，在结果页单独列出）。
  CosIng 给很多普通成分也登记了 PERFUMING / FRAGRANCE 功能（如 Glycerin、Citric Acid、Butylene Glycol），这些不算加香。成分库已有的条目在 CosIng 中能找到时同样按 a–c 判断；找不到时保留成分库的标签。
- **网页只打包用到的部分**：CosIng 全表有数万行，构建时只保留产品成分表中出现的成分（vite.config.ts 的 cosing-used 插件）；测试和脚本读取完整文件。

## chelators.csv（螯合剂清单）

本项目维护的螯合剂清单，只收录明确的螯合剂。用于两处：硬水城市的环境适配，以及常用造型产品的用户的"产品残留"需求。**不对应"清爽洁净"**。柠檬酸、柠檬酸钠、葡萄糖酸钠等虽然在 CosIng 登记了 chelating 功能，但不算。

| 字段 | 含义 |
|---|---|
| inci_name | INCI 名 |
| abbreviation | 常用缩写（如 GLDA、MGDA），匹配时也算 |
| name_zh | 中文名 |
| cas_no / cosing_ref | CAS 号、CosIng 编号 |
| source_level | 来源级别：cir（CIR 安全评估）/ peer_reviewed（同行评议文献）/ cosing（CosIng 条目）。优先用 CIR |
| source_url | 来源（目前为对应的 CosIng 条目页） |
| added_on | 加入日期 |

当前 17 个（按作者指定）：
- 2026-10-17：Disodium EDTA、Tetrasodium EDTA、Tetrasodium Glutamate Diacetate（GLDA）、Trisodium Ethylenediamine Disuccinate、Trisodium Dicarboxymethyl Alaninate（MGDA）、Tetrasodium Iminodisuccinate、Sodium Phytate、Phytic Acid、Etidronic Acid、Pentasodium Pentetate；
- 2026-10-18：EDTA、HEDTA、Trisodium HEDTA、Trisodium EDTA、Calcium Disodium EDTA、Dipotassium EDTA、Diammonium EDTA。

EDTA 及其盐类（9 个）的来源为 CIR 安全评估（Final report on the safety assessment of EDTA, calcium disodium EDTA, diammonium EDTA, dipotassium EDTA, disodium EDTA, TEA-EDTA, tetrasodium EDTA, tripotassium EDTA, trisodium EDTA, HEDTA, and trisodium HEDTA. Int J Toxicol 2002;21 Suppl 2:95–142，PubMed 12396676），source_level = cir；其余 8 个暂用 CosIng 条目页（source_level = cosing）。CIR 来源已由作者于 2026-10-18 核对（标题列出 HEDTA 和 Trisodium HEDTA）；CosIng 条目页链接未能在开发环境中逐个打开核对。

## fragrance_ingredients.csv（加香成分清单）

加香判断规则 (c) 用的清单：inci_name、basis（列入依据，目前都是 cosing_perfuming_only = CosIng 只登记了香料功能）、cosing_ref、source_url、added_on。2026-10-17 由原规则"CosIng 功能只有香料类"在产品中识别出的 12 个成分转入，判断结果与原规则相同。新产品中出现 CosIng 只登记了香料功能、但不在清单上的成分时，`npm run validate-data` 会提示，由人工决定是否加入。

## retail_ratings.csv（零售商评分）

每行是一个产品在一个平台的评分，一个产品可以有多行。**只展示，不计入任何分数。**

| 字段 | 含义 |
|---|---|
| product_id | 对应 products.csv |
| platform | ulta / sephora / target / amazon / nordstrom / neiman_marcus / saks / bergdorf_goodman / bluemercury（与 purchase_links 共用平台取值，还有 brand）。也接受 neimanmarcus、bergdorf、bergdorfgoodman、saksfifthavenue 的写法，读取时统一为左边的代码 |
| rating | 星级 0–5，取页面可见值。页面没有显示星级时留空（不填 0），这条评分不显示，校验只提示 |
| rating_count | 精确评价数；页面只显示缩写（如 5.5K）时留空，不推算 |
| rating_count_display | 页面显示的原文（如 1,346、5.5K、(6,395)） |
| count_label | 评价数口径：Reviews（Ulta）、header review link（Sephora）、page header count（Target）、ratings（Amazon，含无文字的星级评价） |
| checked_on / url / note | 核对日期、产品页、口径和卖家说明 |

页面规则（`src/data/retail.ts`）：评价数少于 50 的不显示（只有缩写时按缩写判断门槛，显示原文）；按平台固定顺序列在详情里，注明"评分只作参考，不计入适配分；部分评价可能来自赠品试用；不同规格、香型可能合并统计"。不计算跨平台平均分。

当前数据：美国洗护零售元数据第 1 批（SH-US-001—010、CO-US-001—010），2026-10-17 核对，41 条（Ulta 18、Sephora 4、Target 18、Amazon 1）。美国洁面 CL-US-001—040，2026-10-19 核对，54 条（Ulta 34、Target 11、Sephora 7、Bluemercury 1、Nordstrom 1），其中 8 条星级留空。

## purchase_links.csv（多平台购买链接）

| 字段 | 含义 |
|---|---|
| product_id | 对应 products.csv |
| platform | brand（品牌官网）/ ulta / sephora / target / amazon / nordstrom / neiman_marcus / saks（Saks Fifth Avenue）/ bergdorf_goodman / bluemercury。也接受 neimanmarcus、bergdorf、bergdorfgoodman、saksfifthavenue 的写法，读取时统一为左边的代码 |
| url | 平台上的产品页（不用搜索结果页） |
| status | in_stock / purchasable / listed / official_store_listed_pdp_blocked（品牌店目录已确认，详情页和库存未确认）等，空白不等于不销售 |
| checked_on / note | 核对日期、说明（如 Target Plus 第三方卖家） |

页面详情"在哪买"按固定顺序每个平台一行：品牌官网 → Ulta → Sephora → Target → Amazon → Nordstrom → Neiman Marcus → Saks Fifth Avenue → Bergdorf Goodman → Bluemercury（`RETAIL_PLATFORMS`）→ 其他网站。平台由链接域名识别（`RETAIL_PLATFORM_DOMAINS`）。收起状态的主购买按钮默认指向评价数最多的平台，没有评分时用 products.csv 的 purchase_url。当前洗护 20 款、63 条链接；美国洁面 40 款、100 条链接（2026-10-19）。

## exchange_rates.csv（固定汇率表）

用于把产品的当地价格换算成 USD，与用户的单件预算上限比较；给用户展示预算选项时再换算成当地货币。

汇率采用美联储 H.10 官方汇率（https://www.federalreserve.gov/releases/h10/current/ ），按 H.10 的报价方式记录"1 USD 兑多少该货币"。**每次更新产品数据（尤其是价格）时，同步更新汇率表**：取最新一期 H.10，所有币种用同一个数据日期，并更新 data_date。

| 字段 | 含义 | 示例 |
|---|---|---|
| currency | 货币代码（3 位大写）；必须有 USD 一行，per_usd 为 1 | JPY |
| per_usd | 1 USD 兑多少该货币 | 158.3400 |
| data_date | 数据日期，即汇率对应的日期（不是 H.10 的发布日期），YYYY-MM-DD | 2026-10-09 |
| source | 来源链接 | https://www.federalreserve.gov/releases/h10/current/ |

当前数据：2026 年 10 月 13 日发布的 H.10 中 10 月 9 日的汇率。

## water_hardness.csv（水硬度记录）

每行是一个供水系统、水厂、水源或配水点在某个时期的数据，一个城市可以有多行（例如洛杉矶 6 个水源、费城 3 个水厂）。列沿用资料提供的 21 列（region_id、geographic_scope、statistic_type、hardness_value_mg_L_CaCO3、reported_range_min/max、hardness_class、sample_period、confidence_for_household_tap、formula_note、source_url、retrieved_on 等），前面加 city、country 两列对应 cities.csv。

- 数值单位 mg/L，以 CaCO3 计；hardness_class 按 USGS：≤60 soft，>60–120 moderately_hard，>120–180 hard，>180 very_hard；跨两级的写 hard_or_very_hard 或 moderately_hard_or_hard；官方报告没有数值的写 unknown。
- **不按同城记录平均，也不以第一条代表全市。** 城市等级由记录汇总（`summarizeHardness`）：所有记录等级相同时取该等级；都属于硬或很硬时取"硬"；其他不一致或跨两级时为 varies（"因供水分区而异"，环境适配按中性计分）；没有分级记录为 unknown。
- 页面逐条显示分区、口径（年均、单次、范围、月均、由钙镁换算等）、数值或范围、时期、来源和资料备注。
- 现有 20 个城市有记录（2026-10-16、10-17 核对）。Miami、Atlanta 官方报告没有总硬度数值，保持 unknown；San Jose、Irvine 尚无记录。

## water_hardness_reference.csv（参照城市水硬度）

只用于问卷城市页刻度条上的对照，**不赋给用户城市**，也不参与打分。各城市统计口径不同（年均、单点、分区），不能当作同一年度全城平均直接比较。

| 字段 | 含义 |
|---|---|
| city / city_zh / country | 城市英文名、中文名、国家或地区 |
| water_supplier | 供水或发布机构（原文） |
| hardness_value_mg_L_CaCO3 | 数值，mg/L，以 CaCO3 计；未取得时留空，statistic_type 写 not_found |
| range_min_mg_L_CaCO3 / range_max_mg_L_CaCO3 | 范围，按原文保留（如 "<5"），只用于显示 |
| data_period / data_year | 数据时期、年份 |
| supply_scope | 适用范围（中文），页面在数据说明中显示 |
| statistic_type | annual_mean / single_sample / quarterly_mean_and_range / annual_mean_and_max / period_mean_and_range / annual_mean_and_range / not_found |
| data_status / source_url / notes / retrieved_on | 数据状态、官方来源（分号分隔）、资料备注、核对日期 |

当前 7 个城市（2026-10-17 核对）：东京 61.4（区部净水厂出水年均）、首尔 58（单点）、上海 126（青浦区出厂水）、巴黎 297（CENTRE 供水区，°f 按 1 °f = 10 mg/L 换算）、香港 38（范围 <5–72）、多伦多 119；伦敦未找到可核查的官方数值，不填第三方数值。

## 水硬度在页面上的显示

- 默认只显示一行"等级 · 数值 · 来源"和刻度条：刻度条按 USGS 分四档（0–60 软水、61–120 中等、121–180 硬水、>180 很硬），用户城市只有一个数值时为圆点，多个分区时为一段；参照城市为细刻度，下方列出名称和数值。
- 各条记录的口径、时期、范围、资料备注，以及参照城市的范围和出处，收进"数据说明"折叠。
- 内部取值不直接显示：统计口径代码翻译成中文（未登记的写"其他口径"）；采样时期整理成"2025 年全年""2025 年第 4 季度"等，写明未注明的（如 not_stated_in_FAQ）显示"未注明"，其他认不出的写法只取其中的日期或不显示（`src/data/water.ts` 的 formatPeriod）。

## ingredient_explanations.csv（常见成分通俗解释）

产品中出现频率最高的约 150 个成分里，成分库没有的（只在 CosIng 中）在这里起草一两句中英文通俗解释。**全部为起草稿，未经人工核对**（review_status = draft），页面标注"通俗解释为起草稿，未核对"。成分库已有的条目用成分库的 explain_zh / explain_en。

| 字段 | 含义 |
|---|---|
| inci_name | INCI 名（与 CosIng 写法一致即可，大小写不限）；成分库已收录的成分不要放在这里 |
| explain_zh / explain_en | 通俗解释，一两句；只说明在配方中的作用，不写功效承诺 |
| review_status | draft / verified |
| drafted_on | 起草日期 |

成分弹窗还会显示该成分的 CosIng 登记功能（翻译成通俗中文，见 `src/data/cosingFunctions.ts`），并注明来源和获取日期。登记功能是成分在配方中的作用，不是功效。

## cities.csv（城市环境）

湿度、紫外线、季节由天气接口实时获取，这里只存不常变化的属性。

| 字段 | 含义 |
|---|---|
| city / country | 城市、国家 |
| review_status | draft / verified。只有 verified 城市的水硬度参与环境适配；测试模式下 draft 的也参与 |

水硬度见 water_hardness.csv。旧格式（直接写 water_hardness 列）仍可读取，没有分区记录时沿用。

