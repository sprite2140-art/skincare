// 数据校验：error 表示格式错误（CI 失败），warning 表示需要补充的数据（不阻断）。

import { buildIngredientIndex, normalizeName } from './ingredientIndex';
import { ingredientFrequency } from './frequency';
import {
  CATEGORIES, CATEGORY_DEFAULT_USAGE, CN_AVAILABILITY, CONFLICT_SEVERITIES, EVIDENCE_LEVELS, INGREDIENT_CATEGORIES, REGIONS,
  REVIEW_STATUSES, RISK_TAGS, TARGETS, TRANSPARENCY, USAGE_TYPES, WATER_HARDNESS, ZONES,
} from './types';
import type { Category, City, ExchangeRate, Ingredient, Product } from './types';

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
      if (ing.sources.length === 0) err(F_ING, key, 'verified 成分缺少 sources');
      if (ing.category === 'active' && ing.targets.length > 0 && !ing.evidenceLevel) {
        err(F_ING, key, 'verified 有效成分缺少 evidence_level');
      }
    }
    if (ing.reviewedOn && !DATE_RE.test(ing.reviewedOn)) err(F_ING, key, `reviewed_on 应为 YYYY-MM-DD：${ing.reviewedOn}`);
  }

  const index = buildIngredientIndex(ingredients);
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
    oneOf(F_PRD, key, 'available_in_cn', p.availableInCn, CN_AVAILABILITY);
    oneOf(F_PRD, key, 'transparency', p.transparency, TRANSPARENCY);
    if (p.inciList.length === 0) err(F_PRD, key, 'inci_list 为空');
    if (p.price === null) warn(F_PRD, key, 'price 为空或不是数字');
    else if (p.price <= 0) err(F_PRD, key, `price 应为正数：${p.price}`);
    else if (!p.currency) err(F_PRD, key, '有 price 但缺 currency');
    else if (!rateCurrencies.has(p.currency)) err(F_PRD, key, `currency "${p.currency}" 不在 exchange_rates.csv`);
    if (p.sizeMl !== null && !(p.sizeMl > 0)) err(F_PRD, key, `size_ml 应为正数：${p.sizeMl}`);
    for (const url of p.sourceUrls) {
      if (!/^https?:\/\//.test(url)) err(F_PRD, key, `source_url 中的 "${url}" 不是 http(s) 链接（多个链接用分号分隔）`);
    }
  }
  // 按统一后的名称合并、按出现次数排序，即"成分库扩充优先清单"
  for (const row of ingredientFrequency(products, index)) {
    const spellings = row.spellings.length > 1 ? `；写法：${row.spellings.join(' / ')}` : '';
    if (row.reviewStatus === null) warn(F_PRD, row.name, `成分不在成分库（出现在 ${row.productCount} 个产品中${spellings}）`);
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
  }

  return issues;
}
