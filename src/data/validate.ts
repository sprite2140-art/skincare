// 数据校验：error 表示格式错误（CI 失败），warning 表示需要补充的数据（不阻断）。

import { aliasMap, buildIngredientIndex, INCI_ALIAS_TYPES, normalizeName, resolveAlias, type InciAlias } from './ingredientIndex';
import { unmatchedKeyActives } from './keyActives';
import { SOURCE_LEVELS, expandIngredients, onlyFragranceFunctions, type AllergenEntry, type CosingEntry, type ExplanationEntry, type IngredientLists } from './cosing';
import { ingredientFrequency } from './frequency';
import { validateFaceProduct } from './face';
import { ACTIVE_CLASSES, INDUSTRY_PRACTICE, type ActiveClassEntry } from './faceActives';
import { highestLevel } from '../scoring/evidence';
import {
  PREGNANCY_NOTES, US_REGULATORY_STATUSES, YES_NO_UNKNOWN, BRAND_CLAIM_STATUSES, CATEGORIES, INCLUSION_BASIS_TYPES, PRODUCT_SUBTYPES, RETAIL_PLATFORMS, CATEGORY_DEFAULT_USAGE, CLAIM_SOURCES, CN_AVAILABILITY, FRAGRANCE_FREE_CLAIMS, CONFLICT_SEVERITIES, EVIDENCE_LEVELS, INGREDIENT_CATEGORIES, REGIONS,
  EVIDENCE_USAGES, REVIEW_STATUSES, RISK_TAGS, TARGETS, TRANSPARENCY, USAGE_TYPES, WATER_HARDNESS, ZONES,
} from './types';
import type { Category, Target, City, ExchangeRate, Ingredient, Product, ReferenceWater, WaterRecord } from './types';

/** water_hardness.csv 的 hardness_class 取值（USGS 分级，以 CaCO3 计；跨两级的单独列出） */
const WATER_CLASSES = ['soft', 'moderately_hard', 'hard', 'very_hard', 'hard_or_very_hard', 'moderately_hard_or_hard', 'unknown'] as const;

export interface Issue {
  level: 'error' | 'warning';
  file: string;
  key: string;
  message: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateData(
  ingredients: Ingredient[],
  products: Product[],
  cities: City[],
  exchangeRates: ExchangeRate[],
  /** CosIng 批量导入的成分和欧盟香料致敏原清单；用于匹配产品成分，不做成分库的格式检查 */
  extra: { cosing?: CosingEntry[]; allergens?: AllergenEntry[]; water?: WaterRecord[]; referenceWater?: ReferenceWater[]; explanations?: ExplanationEntry[]; lists?: IngredientLists; aliases?: InciAlias[]; faceClasses?: ActiveClassEntry[] } = {},
): Issue[] {
  const issues: Issue[] = [];
  const err = (file: string, key: string, message: string) =>
    issues.push({ level: 'error', file, key, message });
  const warn = (file: string, key: string, message: string) =>
    issues.push({ level: 'warning', file, key, message });

  const oneOf = <T extends string>(
    file: string, key: string, field: string, value: string, allowed: readonly T[],
  ) => {
    if (!(allowed as readonly string[]).includes(value)) {
      err(file, key, `${field} 取值 "${value}" 不在允许范围：${allowed.join(' / ')}`);
    }
  };

  // ingredients.csv
  const F_ING = 'ingredients.csv';
  const seenNames = new Map<string, string>();
  const seenPrimary = new Set<string>();
  for (const ing of ingredients) {
    const key = ing.inciName || '(缺 inci_name)';
    if (!ing.inciName) err(F_ING, key, 'inci_name 为空');
    // inci_name 是主键：同名（忽略大小写）的第二行会被索引忽略，必须报错
    const primary = normalizeName(ing.inciName);
    if (seenPrimary.has(primary)) err(F_ING, key, 'inci_name 重复（忽略大小写）');
    seenPrimary.add(primary);
    oneOf(F_ING, key, 'category', ing.category, INGREDIENT_CATEGORIES);
    oneOf(F_ING, key, 'review_status', ing.reviewStatus, REVIEW_STATUSES);
    if (ing.evidenceLevel !== null) oneOf(F_ING, key, 'evidence_level', ing.evidenceLevel, EVIDENCE_LEVELS);
    for (const t of ing.targets) oneOf(F_ING, key, 'targets', t, TARGETS);
    for (const t of ing.riskTags) oneOf(F_ING, key, 'risk_tags', t, RISK_TAGS);
    if (ing.riskTags.includes('active_irritant')) err(F_ING, key, 'active_irritant 由面部有效成分类别清单算出，不要在 risk_tags 中填写');
    for (const c of ing.conflictsWith) oneOf(F_ING, key, 'conflicts_with 严重程度', c.severity, CONFLICT_SEVERITIES);

    for (const name of [ing.inciName, ...ing.aliases]) {
      const n = normalizeName(name);
      const owner = seenNames.get(n);
      // 主名重复已在上面报过，这里只报别名与其他成分冲突
      if (owner && normalizeName(owner) !== primary) err(F_ING, key, `名称 "${name}" 与成分 "${owner}" 重复`);
      seenNames.set(n, ing.inciName);
    }

    if (ing.reviewStatus === 'verified') {
      if (!ing.reviewedOn) err(F_ING, key, 'verified 成分缺少 reviewed_on');
      // 查证后没有找到可引用的研究时，sources 可以为空，但要在 notes 写明原因（这类需求按 C 级计，与暂无证据相同）
      if (ing.sources.length === 0 && !ing.notes) err(F_ING, key, 'verified 成分缺少 sources（没有可引用的出处时在 notes 写明原因）');
      else if (ing.sources.length === 0) warn(F_ING, key, `verified 成分没有出处，原因：${ing.notes}`);
      const allUnknown = Object.values(ing.evidenceByTarget ?? {}).every((l) => l === 'unknown') && Object.keys(ing.evidenceByTarget ?? {}).length > 0;
      if (ing.category === 'active' && ing.targets.length > 0 && !ing.evidenceLevel && !allUnknown) {
        err(F_ING, key, 'verified 有效成分缺少 evidence_level');
      }
      if (ing.category === 'active' && ing.targets.length > 0 && Object.keys(ing.evidenceByTarget ?? {}).length === 0) {
        err(F_ING, key, 'verified 有效成分缺少 evidence_by_target（每个需求单独的证据等级）');
      }
    }
    if (ing.reviewedOn && !DATE_RE.test(ing.reviewedOn)) err(F_ING, key, `reviewed_on 应为 YYYY-MM-DD：${ing.reviewedOn}`);
    // evidence_by_target：每个需求单独的证据等级；需求必须在 targets 中，evidence_level 为其中最高的一级
    const byTarget = ing.evidenceByTarget ?? {};
    for (const [t, level] of Object.entries(byTarget)) {
      oneOf(F_ING, key, 'evidence_by_target 需求', t, TARGETS);
      oneOf(F_ING, key, `evidence_by_target 中 ${t} 的等级`, level ?? '', [...EVIDENCE_LEVELS, 'unknown']);
      if (!ing.targets.includes(t as Target)) err(F_ING, key, `evidence_by_target 中的 ${t} 不在 targets 里`);
    }
    if (Object.keys(byTarget).length > 0) {
      const missing = ing.targets.filter((t) => !(t in byTarget));
      if (missing.length > 0) err(F_ING, key, `targets 中的 ${missing.join(' / ')} 没有在 evidence_by_target 写等级`);
      const top = highestLevel(byTarget);
      if (top && ing.evidenceLevel !== top) err(F_ING, key, `evidence_level 应为 evidence_by_target 中最高的一级 ${top}`);
    }
    if (ing.evidenceUsage) oneOf(F_ING, key, 'evidence_usage', ing.evidenceUsage, EVIDENCE_USAGES);
    if (ing.evidenceMinConcentration != null && !(ing.evidenceMinConcentration > 0)) err(F_ING, key, 'evidence_min_concentration 应为正数（%）');
    if (ing.usRegulatoryStatus) oneOf(F_ING, key, 'us_regulatory_status', ing.usRegulatoryStatus, US_REGULATORY_STATUSES);
    if (ing.pregnancyNote) oneOf(F_ING, key, 'pregnancy_note', ing.pregnancyNote, PREGNANCY_NOTES);
    if (ing.photosensitizing) oneOf(F_ING, key, 'photosensitizing', ing.photosensitizing, YES_NO_UNKNOWN);
  }

  const all = expandIngredients(ingredients, extra.cosing ?? [], extra.allergens ?? [], extra.explanations ?? [], extra.lists ?? {});
  const index = buildIngredientIndex(all, extra.aliases ?? []);

  // inci_aliases.csv：只收对应关系明确、有出处的别名；INCI 名必须能在成分库或 CosIng 中找到
  const F_ALIAS = 'inci_aliases.csv';
  const plainIndex = buildIngredientIndex(all);
  const seenAlias = new Set<string>();
  for (const a of extra.aliases ?? []) {
    const key = a.alias || '(缺 alias)';
    const n = normalizeName(a.alias);
    if (seenAlias.has(n)) err(F_ALIAS, key, '别名重复');
    seenAlias.add(n);
    oneOf(F_ALIAS, key, 'alias_type', a.aliasType, INCI_ALIAS_TYPES);
    if (!/^https?:\/\//.test(a.sourceUrl)) err(F_ALIAS, key, '必须填写 source_url（对应关系的出处）');
    if (!plainIndex.get(a.inci)) err(F_ALIAS, key, `INCI 名 "${a.inci}" 不在成分库，也不在 CosIng`);
    const own = plainIndex.get(a.alias);
    if (own) warn(F_ALIAS, key, `别名本身已能匹配到 "${own.inciName}"，别名表会改为匹配 "${a.inci}"，请确认`);
  }
  if (extra.cosing && extra.cosing.length === 0) warn('cosing_ingredients.csv', '-', '尚未导入 CosIng 数据（npm run import-cosing -- <文件>），只用成分库和致敏原清单匹配');
  for (const ing of ingredients) {
    for (const c of ing.conflictsWith) {
      if (!index.get(c.inci)) warn(F_ING, ing.inciName, `conflicts_with 中的 "${c.inci}" 不在成分库`);
    }
  }

  // exchange_rates.csv
  const F_FX = 'exchange_rates.csv';
  const rateCurrencies = new Set<string>();
  for (const r of exchangeRates) {
    const key = r.currency || '(缺 currency)';
    if (!/^[A-Z]{3}$/.test(r.currency)) err(F_FX, key, 'currency 应为 3 位大写货币代码，如 USD');
    if (rateCurrencies.has(r.currency)) err(F_FX, key, 'currency 重复');
    rateCurrencies.add(r.currency);
    if (!(Number.isFinite(r.perUsd) && r.perUsd > 0)) err(F_FX, key, 'per_usd 应为正数');
    if (r.currency === 'USD' && r.perUsd !== 1) err(F_FX, key, 'USD 的 per_usd 必须为 1');
    if (!DATE_RE.test(r.dataDate)) err(F_FX, key, `data_date 应为 YYYY-MM-DD：${r.dataDate}`);
    if (!r.source && r.currency !== 'USD') warn(F_FX, key, '缺少 source（汇率来源）');
  }
  if (!rateCurrencies.has('USD')) err(F_FX, 'USD', '缺少 USD');
  // 所有币种必须是同一天的汇率
  const dates = [...new Set(exchangeRates.map((r) => r.dataDate))];
  if (dates.length > 1) err(F_FX, 'data_date', `各币种的 data_date 应相同，目前有：${dates.join(', ')}`);

  // products.csv
  const F_PRD = 'products.csv';
  const seenIds = new Set<string>();
  for (const p of products) {
    const key = p.productId || '(缺 product_id)';
    if (!p.productId) err(F_PRD, key, 'product_id 为空');
    if (seenIds.has(p.productId)) err(F_PRD, key, 'product_id 重复');
    seenIds.add(p.productId);
    oneOf(F_PRD, key, 'zone', p.zone, ZONES);
    oneOf(F_PRD, key, 'category', p.category, CATEGORIES);
    if (p.usageType !== null) oneOf(F_PRD, key, 'usage_type', p.usageType, USAGE_TYPES);
    else if ((CATEGORIES as readonly string[]).includes(p.category) && CATEGORY_DEFAULT_USAGE[p.category as Category] === null) {
      err(F_PRD, key, `品类 ${p.category} 没有默认使用方式，usage_type 必须填写 rinse_off 或 leave_on`);
    }
    oneOf(F_PRD, key, 'region', p.region, REGIONS);
    if (p.inclusionBasisType !== null) oneOf(F_PRD, key, 'inclusion_basis_type', p.inclusionBasisType, INCLUSION_BASIS_TYPES);
    oneOf(F_PRD, key, 'available_in_cn', p.availableInCn, CN_AVAILABILITY);
    oneOf(F_PRD, key, 'transparency', p.transparency, TRANSPARENCY);
    if (p.inciList.length === 0) err(F_PRD, key, 'inci_list 为空');
    if (p.price === null) warn(F_PRD, key, 'price 为空或不是数字');
    else if (p.price <= 0) err(F_PRD, key, `price 应为正数：${p.price}`);
    else if (!p.currency) err(F_PRD, key, '有 price 但缺 currency');
    else if (!rateCurrencies.has(p.currency)) err(F_PRD, key, `currency "${p.currency}" 不在 exchange_rates.csv`);
    // key_actives 按品牌原文保存；对应不上成分表的只作为品牌宣称展示，不参与成分匹配
    const unmatched = unmatchedKeyActives(p, (n) => index.get(n));
    if (unmatched.length > 0) warn(F_PRD, key, `key_actives 中对应不上成分表的写法（只作为品牌宣称展示）：${unmatched.join(' / ')}`);
    for (const t of p.claimedBenefits) oneOf(F_PRD, key, 'claimed_benefits', t, TARGETS);
    if (p.claimSource !== null) oneOf(F_PRD, key, 'claim_source', p.claimSource, CLAIM_SOURCES);
    else if (p.claimedBenefits.length > 0) warn(F_PRD, key, 'claimed_benefits 没有填写 claim_source（brand_text / data_classification），按资料分类显示');
    for (const c of p.testedClaims) {
      oneOf(F_PRD, key, 'tested_claims 困扰', c.target, TARGETS);
      if (!/^https?:\/\//.test(c.url)) err(F_PRD, key, 'tested_claims 每一项都必须有测试来源链接');
    }
    oneOf(F_PRD, key, 'fragrance_free_claim', p.fragranceFreeClaim, FRAGRANCE_FREE_CLAIMS);
    if (p.fragranceFreeClaim === 'yes' && !/^https?:\/\//.test(p.fragranceFreeSourceUrl)) {
      err(F_PRD, key, 'fragrance_free_claim = yes 时必须填写 fragrance_free_source_url（无香声明出处）');
    }
    const bc = p.brandClaims;
    if (bc.status !== null) oneOf(F_PRD, key, 'brand_claims_status', bc.status, BRAND_CLAIM_STATUSES);
    if (bc.text && !/^https?:\/\//.test(bc.sourceUrl)) err(F_PRD, key, 'brand_claims 有内容时必须填写 brand_claims_source_url');
    for (const t of bc.targets) oneOf(F_PRD, key, 'brand_claim_targets', t, TARGETS);
    if (bc.targets.length > 0 && !bc.text) err(F_PRD, key, 'brand_claim_targets 有内容时必须有 brand_claims（品牌宣称原文概括）');
    if (bc.text && bc.status !== 'brand_page_summary' && bc.status !== 'brand_page_quote' && bc.status !== 'retail_mismatch') {
      err(F_PRD, key, 'brand_claims 有内容时 brand_claims_status 应为 brand_page_summary（中文概括）、brand_page_quote（原文摘录）或 retail_mismatch（原文摘录，零售商成分表不同）');
    }
    if (p.subtype !== null) {
      oneOf(F_PRD, key, 'subtype', p.subtype, PRODUCT_SUBTYPES);
      if (p.subtype === 'co_wash' && p.category !== 'shampoo') err(F_PRD, key, 'co_wash 是清洁步骤，category 应为 shampoo');
    }
    for (const a of p.awards) {
      if (!a.source || !/^\d{4}$/.test(a.year)) err(F_PRD, key, `awards 每一项需写明来源和 4 位年份（来源|年份|名称|链接）：${a.source}|${a.year}`);
      if (a.url && !/^https?:\/\//.test(a.url)) err(F_PRD, key, `awards 链接不是 http(s)：${a.url}`);
    }
    for (const [field, url] of [['purchase_url', p.purchaseUrl], ['image_url', p.imageUrl]] as const) {
      if (url && !/^https?:\/\//.test(url)) err(F_PRD, key, `${field} 不是 http(s) 链接：${url}`);
    }
    // 图片必须写明来源和使用许可，否则页面不展示（用占位图）
    if (p.imageUrl && (!p.imageSource || !p.imageLicense || !p.imageLicenseUrl || !p.imageAttribution)) {
      warn(F_PRD, key, 'image_url 缺少 image_source、image_license、image_license_url 或 image_attribution，页面将使用占位图');
    }
    // 零售商评分与购买链接
    for (const r of p.ratings) {
      const F = 'retail_ratings.csv';
      oneOf(F, key, 'platform', r.platform, RETAIL_PLATFORMS);
      // 留空只提示；写了但不是 0–5 的数字（如 unknown、笔误）报错
      if (!r.ratingRaw) warn(F, key, `${r.platform} 没有星级，页面不显示这条评分`);
      else if (!(r.rating >= 0 && r.rating <= 5)) err(F, key, `rating 应为 0–5 之间的数字：${r.ratingRaw}`);
      if (!/^https?:\/\//.test(r.url)) err(F, key, `${r.platform} 缺少产品页链接 url`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checkedOn)) err(F, key, `${r.platform} 缺少核对日期 checked_on`);
      if (r.ratingCount === null && !r.ratingCountDisplay) warn(F, key, `${r.platform} 没有评价数，页面不显示这条评分`);
    }
    const seenPlatforms = new Set<string>();
    for (const l of p.purchaseLinks) {
      const F = 'purchase_links.csv';
      oneOf(F, key, 'platform', l.platform, RETAIL_PLATFORMS);
      if (!/^https?:\/\//.test(l.url)) err(F, key, `${l.platform} 的 url 不是 http(s) 链接`);
      if (seenPlatforms.has(l.platform)) warn(F, key, `${l.platform} 有多条购买链接`);
      seenPlatforms.add(l.platform);
    }
    validateFaceProduct(p, (n) => index.get(n), (m) => err(F_PRD, key, m), (m) => warn(F_PRD, key, m));
    if (!p.purchaseUrl) warn(F_PRD, key, '缺少 purchase_url（购买链接）');
    if (p.sizeMl !== null && !(p.sizeMl > 0)) err(F_PRD, key, `size_ml 应为正数：${p.sizeMl}`);
    for (const url of p.sourceUrls) {
      if (!/^https?:\/\//.test(url)) err(F_PRD, key, `source_url 中的 "${url}" 不是 http(s) 链接（多个链接用分号分隔）`);
    }
  }
  for (const p of products) {
    for (const id of p.pairedProductIds) {
      const other = products.find((x) => x.productId === id);
      if (!other) err(F_PRD, p.productId, `paired_product_ids 中的 "${id}" 不在产品表中`);
      else if (other.category === p.category) warn(F_PRD, p.productId, `paired_product_ids 中的 "${id}" 与本产品是同一品类`);
    }
  }
  // 在 CosIng 中找不到的产品成分名：多数是拼写错误或非 INCI 写法，方便逐个核对
  if (extra.cosing && extra.cosing.length > 0) {
    const cosingNames = new Set(extra.cosing.map((c) => normalizeName(c.inciName)));
    const libraryIndex = buildIngredientIndex(ingredients);
    const aliases = aliasMap(extra.aliases ?? []);
    const missing = new Map<string, Set<string>>();
    for (const p of products) {
      for (const n of p.inciList) {
        // 成分库登记的别名也算（如美国写法 Fragrance ↔ 欧盟 Parfum、Pyrithione Zinc ↔ Zinc Pyrithione）
        const lib = libraryIndex.get(n);
        // 别名表（inci_aliases.csv）对应的 INCI 名也算
        const candidates = [n, resolveAlias(n, aliases), ...(lib ? [lib.inciName, ...lib.aliases] : [])];
        if (candidates.some((c) => cosingNames.has(normalizeName(c)))) continue;
        const ids = missing.get(n) ?? new Set<string>();
        ids.add(p.productId);
        missing.set(n, ids);
      }
    }
    for (const [n, ids] of [...missing].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))) {
      warn(F_PRD, n, `成分名在 CosIng 中找不到（可能是拼写错误或非 INCI 写法），出现在：${[...ids].join('、')}`);
    }
  }
  // 按统一后的名称合并、按出现次数排序，即"成分库扩充优先清单"
  for (const row of ingredientFrequency(products, index)) {
    const spellings = row.spellings.length > 1 ? `；写法：${row.spellings.join(' / ')}` : '';
    if (row.reviewStatus === null) warn(F_PRD, row.name, `成分不在成分库，也不在 CosIng（出现在 ${row.productCount} 个产品中${spellings}）`);
    if (row.nameUnverifiedCount > 0) {
      warn(F_PRD, row.name, `名称带 [待核对] 标记，不参与打分（${row.nameUnverifiedCount} 个产品）`);
    }
  }

  // cities.csv
  const F_CITY = 'cities.csv';
  for (const c of cities) {
    const key = `${c.city}, ${c.country}`;
    oneOf(F_CITY, key, 'water_hardness', c.waterHardness, WATER_HARDNESS);
    oneOf(F_CITY, key, 'review_status', c.reviewStatus, REVIEW_STATUSES);
    if (c.country === 'US' && c.water.length === 0) warn(F_CITY, key, '没有水硬度记录（water_hardness.csv）');
  }

  // water_hardness.csv
  const F_WATER = 'water_hardness.csv';
  const seenRegions = new Set<string>();
  for (const w of extra.water ?? []) {
    const key = w.regionId || '(缺 region_id)';
    if (!w.regionId) err(F_WATER, key, 'region_id 为空');
    if (seenRegions.has(w.regionId)) err(F_WATER, key, 'region_id 重复');
    seenRegions.add(w.regionId);
    if (!cities.some((c) => c.city === w.city && c.country === w.country)) err(F_WATER, key, `城市 "${w.city}, ${w.country}" 不在 cities.csv`);
    oneOf(F_WATER, key, 'hardness_class', w.hardnessClass, WATER_CLASSES);
    for (const n of [w.value, w.min, w.max]) if (n !== null && n < 0) err(F_WATER, key, '硬度数值不能为负');
    if (w.min !== null && w.max !== null && w.min > w.max) err(F_WATER, key, `范围下限 ${w.min} 大于上限 ${w.max}`);
    if (w.sources.length === 0) err(F_WATER, key, '缺少 source_url');
    for (const u of w.sources) if (!/^https?:\/\//.test(u)) err(F_WATER, key, `source_url 不是 http(s) 链接：${u}`);
    if (w.hardnessClass !== 'unknown' && w.value === null && (w.min === null || w.max === null)) {
      err(F_WATER, key, '有分级但没有数值或范围');
    }
  }

  // ingredient_explanations.csv（常见成分通俗解释，起草稿）
  const F_EXP = 'ingredient_explanations.csv';
  const seenExp = new Set<string>();
  for (const e of extra.explanations ?? []) {
    const key = e.inciName || '(缺 inci_name)';
    const n = normalizeName(e.inciName);
    if (seenExp.has(n)) err(F_EXP, key, '重复');
    seenExp.add(n);
    if (!e.explainZh || !e.explainEn) err(F_EXP, key, 'explain_zh 和 explain_en 都要填写');
    oneOf(F_EXP, key, 'review_status', e.reviewStatus, REVIEW_STATUSES);
    if (e.reviewStatus === 'verified' && !DATE_RE.test(e.reviewedOn)) err(F_EXP, key, 'verified 的解释必须填写 reviewed_on（YYYY-MM-DD）');
    const ing = index.get(e.inciName);
    if (!ing) warn(F_EXP, key, '成分不在成分库，也不在 CosIng');
    else if (ing.origin === 'library' && !ing.explainFromList) warn(F_EXP, key, '成分库已有通俗解释，这里的不会使用');
  }

  // chelators.csv / fragrance_ingredients.csv（本项目维护的判断清单）
  for (const [file, list] of [['chelators.csv', extra.lists?.chelators], ['fragrance_ingredients.csv', extra.lists?.fragrances]] as const) {
    const seen = new Set<string>();
    for (const e of list ?? []) {
      const key = e.inciName || '(缺 inci_name)';
      if (seen.has(normalizeName(e.inciName))) err(file, key, '重复');
      seen.add(normalizeName(e.inciName));
      if (!/^https?:\/\//.test(e.sourceUrl)) err(file, key, '缺少来源链接 source_url');
      if (file === 'chelators.csv') oneOf(file, key, 'source_level', e.sourceLevel, SOURCE_LEVELS);
    }
  }
  // 维护提示：产品中有 CosIng 只登记了香料功能、但不在加香清单的成分（CosIng 功能本身不参与判断）
  if (extra.lists?.fragrances) {
    const flagged = new Set<string>();
    for (const p of products) {
      for (const raw of p.inciList) {
        const ing = index.get(raw);
        if (!ing || ing.riskTags.includes('fragrance') || !ing.cosingFunctions || !onlyFragranceFunctions(ing.cosingFunctions)) continue;
        if (flagged.has(ing.inciName)) continue;
        flagged.add(ing.inciName);
        warn('fragrance_ingredients.csv', ing.inciName, 'CosIng 只登记了香料功能，但不在加香清单；请确认是否加入');
      }
    }
  }

  // face_active_classes.csv（本项目维护的面部有效成分类别清单）
  const F_CLS = 'face_active_classes.csv';
  const seenCls = new Set<string>();
  for (const e of extra.faceClasses ?? []) {
    const key = e.inciName || '(缺 inci_name)';
    if (seenCls.has(normalizeName(e.inciName))) err(F_CLS, key, '重复');
    seenCls.add(normalizeName(e.inciName));
    oneOf(F_CLS, key, 'active_class', e.activeClass, ACTIVE_CLASSES);
    if (!/^https?:\/\//.test(e.sourceUrl) && e.sourceUrl !== INDUSTRY_PRACTICE) err(F_CLS, key, `缺少来源链接 source_url（没有权威出处时写"${INDUSTRY_PRACTICE}"）`);
    if (!DATE_RE.test(e.addedOn)) err(F_CLS, key, `added_on 应为 YYYY-MM-DD：${e.addedOn}`);
  }

  // water_hardness_reference.csv（参照城市，只用于刻度条对照）
  const F_REF = 'water_hardness_reference.csv';
  for (const w of extra.referenceWater ?? []) {
    const key = w.city || '(缺 city)';
    if (!w.city) err(F_REF, key, 'city 为空');
    if (w.value !== null && w.value < 0) err(F_REF, key, '硬度数值不能为负');
    if (w.value === null && w.statisticType !== 'not_found') err(F_REF, key, '没有数值时 statistic_type 应为 not_found');
    if (w.sources.length === 0) err(F_REF, key, '缺少 source_url');
    for (const u of w.sources) if (!/^https?:\/\//.test(u)) err(F_REF, key, `source_url 不是 http(s) 链接：${u}`);
  }

  return issues;
}
