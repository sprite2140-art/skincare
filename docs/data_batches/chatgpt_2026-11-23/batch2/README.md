# 本次补查增量（2026-11-23）

只交付本次变化，没有重发上一包18款、SE-US-008或其他地区版本。

- products.csv：5行，仍为已验收50列。SE-US-007修正1行；新增洗发水SH-US-093–096共4行。
- purchase_links.csv、retail_ratings.csv：仅本次5款涉及的平台行，按product_id+platform合并，保留其他历史行。
- admission_type_updates.csv：4行奖项入库类型补丁，按product_id将main的第51列inclusion_basis_type设为beauty_award。**需要同时应用**，四款评价不足1000，不能仅凭评分自动入库。50列产品模板不擅自增列。
- coverage_changes.csv：仅3个发生变化的需求/预算组合；remaining_gaps.csv：更新后的7个未完成组合，不包含其他已完成历史组合。
- self_check.md：完整自查及仍未解决事项；source_evidence.json、validation_report.json：来源和检查记录。

SE-US-007此次采用配方一致的Target75mL在售SKU，参考价同步由6美元/30mL改为11.99美元/75mL，避免低价对应大瓶链接。打分INCI及原配方文本保持不变，品牌官网的version_mismatch状态也保留。若产品导入只按位置操作，请先按列名映射至main51列；本包不会修改其他产品字段。

**任务仍未全部完成：精华剩2款，需求/预算组合剩7项。** 未取得一致版本或合格依据的产品未放入products/purchase_links。核对日为本次读取日期；部分零售网页来自缓存，listed不代表保证实时库存。未写入或推送公开仓库。
