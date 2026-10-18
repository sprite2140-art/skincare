// 打分理由里用到的名称（中英文）。界面文案在 src/i18n，这里只放打分输出需要的词。

import type { Ingredient, RiskTag, Target } from '../data/types';

export interface Text {
  zh: string;
  en: string;
}

export const TARGET_LABELS: Record<Target, Text> = {
  acne: { zh: '痘痘闭口', en: 'acne' },
  oil: { zh: '出油', en: 'oiliness' },
  dryness: { zh: '干燥', en: 'dryness' },
  redness: { zh: '泛红敏感', en: 'redness' },
  pigmentation: { zh: '暗沉色斑', en: 'pigmentation' },
  aging: { zh: '细纹松弛', en: 'signs of aging' },
  pores: { zh: '毛孔', en: 'pores' },
  dandruff: { zh: '头皮屑', en: 'dandruff' },
  scalp_oil: { zh: '头皮油', en: 'oily scalp' },
  scalp_itch: { zh: '头皮痒', en: 'itchy scalp' },
  scalp_redness: { zh: '头皮发红', en: 'scalp redness' },
  hair_loss: { zh: '掉发', en: 'hair loss' },
  damage: { zh: '受损', en: 'damage' },
  frizz: { zh: '干枯毛躁', en: 'frizz' },
  flat_hair: { zh: '扁塌', en: 'flat hair' },
  tangling: { zh: '打结', en: 'tangling' },
  color_fade: { zh: '褪色', en: 'color fading' },
  dry_scalp: { zh: '头皮干', en: 'dry scalp' },
  sensitive_scalp: { zh: '敏感头皮', en: 'sensitive scalp' },
  clarifying: { zh: '清爽洁净', en: 'clarifying' },
  buildup: { zh: '产品残留', en: 'product buildup' },
  shine: { zh: '光泽', en: 'shine' },
  curl_definition: { zh: '卷度', en: 'curl definition' },
  tone_yellow: { zh: '去黄', en: 'yellow toning' },
  tone_orange: { zh: '去橙', en: 'orange toning' },
};

export const RISK_TAG_LABELS: Record<RiskTag, Text> = {
  fragrance: { zh: '香精', en: 'fragrance' },
  essential_oil: { zh: '精油', en: 'essential oils' },
  alcohol: { zh: '酒精', en: 'alcohol' },
  strong_acid: { zh: '高浓度酸类', en: 'strong acids' },
  sensitizer: { zh: '致敏成分', en: 'sensitizers' },
  strong_cleanser: { zh: '强清洁力表活', en: 'strong cleansers' },
  pregnancy_caution: { zh: '孕期需注意成分', en: 'pregnancy-caution ingredients' },
  rx_caution: { zh: '与处方皮肤药需注意的成分', en: 'ingredients to watch with prescription skin drugs' },
};

export function ingredientName(ing: Ingredient | null, raw: string): Text {
  if (!ing) return { zh: raw, en: raw };
  return { zh: ing.nameZh || ing.inciName, en: ing.inciName };
}

export function joinNames(names: Text[]): Text {
  return {
    zh: names.map((n) => n.zh).join('、'),
    en: names.map((n) => n.en).join(', '),
  };
}
