// 整套流程的搭配检查（草案第 5 节）：按成分类别的规则 + 成分库逐个成分的 conflicts_with。
// 只看同一时段（早上或晚上）一起用的产品；结果放在结果页顶部，每条附出处。
// 第 8 条（处方药 / 异维 A 酸 + 功效成分）在单品打分时直接排除，不在这里重复。

import { bpoSensitiveRetinoids, EXFOLIANT_CLASSES, findConflictNote, type ActiveClass, type FaceConflictNote } from '../data/faceActives';
import type { IngredientIndex } from '../data/ingredientIndex';
import { usageTypeOf } from '../data/types';
import type { FaceProductScore } from './faceScore';
import type { Schedule, ScheduledStep, TimeOfDay } from './faceSchedule';
import { ingredientName, type Text } from './labels';
import { conflictSeverity } from './score';

export type ConflictRule = 'bpo_retinoid' | 'retinoid_exfoliant' | 'bpo_exfoliant' | 'multi_exfoliant' | 'multi_retinoid' | 'photosensitive_no_sunscreen' | 'vitc_bpo' | 'ingredient';

export interface Source {
  label: string;
  url: string;
}

export interface RoutineConflict {
  rule: ConflictRule;
  /** 发生在哪个时段；与时段无关（如缺防晒）时为 null */
  time: TimeOfDay | null;
  products: FaceProductScore[];
  severity: 'mild' | 'severe';
  text: Text;
  /** 怎么用 */
  advice: Text;
  source: Source | null;
}

const AAD_EXFOLIATE: Source = { label: 'AAD: How to safely exfoliate at home', url: 'https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home' };
const AAD_ANTI_AGING: Source = { label: 'AAD: How to maximize results from anti-aging skin care products', url: 'https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/maximize-anti-aging-products' };
const MARTIN_1998: Source = { label: 'Martin B et al. Br J Dermatol 1998;139 Suppl 52:8–11', url: 'https://pubmed.ncbi.nlm.nih.gov/9990414/' };
const FDA_AHA: Source = { label: 'FDA: Alpha Hydroxy Acids', url: 'https://www.fda.gov/cosmetics/cosmetic-ingredients/alpha-hydroxy-acids' };

const has = (p: FaceProductScore, c: ActiveClass) => p.faceExtras.classes.has(c);
const leaveOn = (p: FaceProductScore) => usageTypeOf(p.product) !== 'rinse_off';
const name = (p: FaceProductScore): Text => ({ zh: p.product.nameZh || p.product.nameEn, en: p.product.nameEn || p.product.nameZh });
const both = (a: FaceProductScore, b: FaceProductScore): Text => ({ zh: `「${name(a).zh}」和「${name(b).zh}」`, en: `"${name(a).en}" and "${name(b).en}"` });
const TIME: Record<TimeOfDay, Text> = { am: { zh: '早上', en: 'morning' }, pm: { zh: '晚上', en: 'evening' } };

const hasExfoliant = (p: FaceProductScore) => EXFOLIANT_CLASSES.some((c) => has(p, c));
/** 去角质类：果酸、水杨酸类、PHA 的免洗产品，或去角质步骤的产品（含磨砂） */
const exfoliates = (s: ScheduledStep) =>
  !!s.product && (s.step.step.id === 'exfoliator' || (hasExfoliant(s.product) && leaveOn(s.product)));

function slotConflicts(time: TimeOfDay, slot: ScheduledStep[], index: IngredientIndex, conflictNotes: FaceConflictNote[]): RoutineConflict[] {
  const out: RoutineConflict[] = [];
  const items = slot.filter((s) => s.product);
  const prods = items.map((s) => s.product!);
  const t = TIME[time];
  const pairs = <T>(list: T[]) => list.flatMap((a, i) => list.slice(i + 1).map((b) => [a, b] as const));

  // 1. 过氧化苯甲酰 + A 醇类（阿达帕林除外：与过氧化苯甲酰同用稳定，FDA 批准了两者的复方）
  const degradable = (p: FaceProductScore) => bpoSensitiveRetinoids(p.faceExtras.classes).length > 0;
  for (const [a, b] of pairs(prods)) {
    const [bpo, ret] = has(a, 'benzoyl_peroxide') && degradable(b) ? [a, b] : has(b, 'benzoyl_peroxide') && degradable(a) ? [b, a] : [null, null];
    if (!bpo || !ret) continue;
    out.push({
      rule: 'bpo_retinoid', time, products: [bpo, ret], severity: 'mild', source: MARTIN_1998,
      text: { zh: `${t.zh}的${both(bpo, ret).zh}分别含过氧化苯甲酰和 A 醇类`, en: `${both(bpo, ret).en} in the ${t.en} contain benzoyl peroxide and a retinoid` },
      advice: { zh: '不要同时涂：过氧化苯甲酰放早上，A 醇类放晚上', en: 'Do not apply together: benzoyl peroxide in the morning, retinoid at night' },
    });
  }
  // 2. A 醇类 + 去角质产品；3. 过氧化苯甲酰 + 去角质产品
  for (const s of items.filter(exfoliates)) {
    for (const p of prods) {
      if (p === s.product) continue;
      if (has(p, 'retinoid')) {
        out.push({
          rule: 'retinoid_exfoliant', time, products: [s.product!, p], severity: 'mild', source: AAD_EXFOLIATE,
          text: { zh: `${both(s.product!, p).zh}：去角质和 A 醇类一起用，可能加重干燥和刺激`, en: `${both(s.product!, p).en}: exfoliating with a retinoid can add dryness and irritation` },
          advice: s.weekly
            ? { zh: '去角质的那晚不用 A 醇类', en: 'Skip the retinoid on nights you exfoliate' }
            : { zh: '分开早晚或隔天使用', en: 'Use them at different times of day or on alternate days' },
        });
      }
      if (has(p, 'benzoyl_peroxide')) {
        out.push({
          rule: 'bpo_exfoliant', time, products: [s.product!, p], severity: 'mild', source: AAD_EXFOLIATE,
          text: { zh: `${both(s.product!, p).zh}：去角质和过氧化苯甲酰一起用，可能加重干燥`, en: `${both(s.product!, p).en}: exfoliating with benzoyl peroxide can add dryness` },
          advice: { zh: '错开时段或错开日子', en: 'Use them at different times or on different days' },
        });
      }
    }
  }
  // 4. 同一时段两个以上去角质类产品（含水杨酸洁面）
  const exf = items.filter((s) => s.product && (exfoliates(s) || hasExfoliant(s.product))).map((s) => s.product!);
  if (exf.length >= 2) {
    out.push({
      rule: 'multi_exfoliant', time, products: exf, severity: 'mild', source: AAD_EXFOLIATE,
      text: { zh: `${t.zh}有 ${exf.length} 个去角质类产品（果酸、水杨酸类、PHA 或去角质）`, en: `${exf.length} exfoliating products in the ${t.en} (AHAs, BHAs, PHAs or an exfoliator)` },
      advice: { zh: '同一时段只保留一个，其余换成不含这些成分的产品', en: 'Keep only one at a time; swap the others for products without these ingredients' },
    });
  }
  // 5. 两个 A 醇类产品
  const rets = prods.filter((p) => has(p, 'retinoid'));
  if (rets.length >= 2) {
    out.push({
      rule: 'multi_retinoid', time, products: rets, severity: 'mild', source: AAD_ANTI_AGING,
      text: { zh: `${t.zh}有 ${rets.length} 个含 A 醇类的产品`, en: `${rets.length} products with retinoids in the ${t.en}` },
      advice: { zh: '只保留一个；同时用多种抗老产品可能刺激皮肤', en: 'Keep only one; using several anti-aging products at once can irritate skin' },
    });
  }
  // 7. 维生素 C + 过氧化苯甲酰（行业惯例，没有找到权威出处）
  for (const [a, b] of pairs(prods)) {
    const [c, bpo] = has(a, 'vitamin_c') && has(b, 'benzoyl_peroxide') ? [a, b] : has(b, 'vitamin_c') && has(a, 'benzoyl_peroxide') ? [b, a] : [null, null];
    if (!c || !bpo) continue;
    out.push({
      rule: 'vitc_bpo', time, products: [c, bpo], severity: 'mild', source: null,
      text: { zh: `${both(c, bpo).zh}分别含维生素 C 和过氧化苯甲酰`, en: `${both(c, bpo).en} contain vitamin C and benzoyl peroxide` },
      advice: { zh: '错开早晚使用（行业惯例）', en: 'Use them at different times of day (common practice)' },
    });
  }
  // 成分库的 conflicts_with（逐个成分）：有搭配提醒记录（data/face_conflicts.csv）时用它的用法和出处；
  // 同一对产品已经有类别规则的提醒时不重复
  const reported = new Set(out.map((c) => c.products.map((p) => p.product.productId).sort().join(',')));
  for (const [a, b] of pairs(prods)) {
    const pairKey = [a.product.productId, b.product.productId].sort().join(',');
    if (reported.has(pairKey)) continue;
    for (const ra of a.product.inciList) {
      const ia = index.get(ra);
      if (!ia) continue;
      for (const rb of b.product.inciList) {
        const ib = index.get(rb);
        if (!ib || ia === ib) continue;
        const severity = conflictSeverity(ia, ib);
        if (!severity) continue;
        // 同一对产品只报一次
        if (reported.has(pairKey)) break;
        const na = ingredientName(ia, ra);
        const nb = ingredientName(ib, rb);
        const note = findConflictNote(conflictNotes, ia, ib);
        reported.add(pairKey);
        out.push({
          rule: 'ingredient', time, products: [a, b], severity,
          source: note ? { label: `${note.id} · ${/dailymed/i.test(note.sourceUrl) ? 'DailyMed' : 'source'}`, url: note.sourceUrl } : null,
          text: note
            ? { zh: `${both(a, b).zh}：${na.zh}与${nb.zh}一起用可能增加干燥或刺激`, en: `${both(a, b).en}: ${na.en} with ${nb.en} may add dryness or irritation` }
            : { zh: `${both(a, b).zh}：${na.zh}与${nb.zh}有冲突`, en: `${both(a, b).en}: ${na.en} conflicts with ${nb.en}` },
          advice: note
            ? { zh: `提醒：${note.sameSessionRule}`, en: 'Reminder: avoid layering them at the same time on your own; follow the product labels and your doctor' }
            : severity === 'severe'
              ? { zh: '不建议一起使用', en: 'Not recommended together' }
              : { zh: '建议分开早晚使用', en: 'Use them at different times of day' },
        });
        break;
      }
    }
  }
  return out;
}

export function checkRoutineConflicts(schedule: Schedule, index: IngredientIndex, conflictNotes: FaceConflictNote[] = []): RoutineConflict[] {
  const all = [...slotConflicts('am', schedule.am, index, conflictNotes), ...slotConflicts('pm', schedule.pm, index, conflictNotes)];
  // 早晚都用的产品之间的冲突只报一次
  const seen = new Set<string>();
  const out = all.filter((c) => {
    const key = `${c.rule}|${c.products.map((p) => p.product.productId).sort().join(',')}|${c.text.zh.replace(/^早上|^晚上/, '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // 6. 有让皮肤更怕晒的成分，但流程里没有防晒
  const products = [...schedule.am, ...schedule.pm].map((s) => s.product).filter((p): p is FaceProductScore => !!p);
  const photo = products.filter((p) => has(p, 'aha') || has(p, 'retinoid') || p.product.inciList.some((raw) => index.get(raw)?.photosensitizing === 'yes'));
  const hasSunscreen = schedule.am.some((s) => s.step.step.id === 'sunscreen' && s.product);
  if (photo.length > 0 && !hasSunscreen) {
    out.push({
      rule: 'photosensitive_no_sunscreen', time: null, products: [...new Set(photo)], severity: 'mild', source: FDA_AHA,
      text: { zh: '这套流程里有让皮肤更怕晒的成分（果酸或 A 醇类）', en: 'This routine has ingredients that make skin more sensitive to the sun (AHAs or retinoids)' },
      advice: { zh: '早上一定要用 SPF 30 以上的广谱防晒', en: 'Always use a broad-spectrum SPF 30+ sunscreen in the morning' },
    });
  }
  return out;
}
