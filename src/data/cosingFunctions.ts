// CosIng 登记功能（function）的通俗翻译。CosIng 的功能是欧盟登记的"在配方中的作用"，
// 不是功效宣称，也不代表在产品中的用量和效果。未收录的功能显示原文。

const COSING_FUNCTIONS: Record<string, { zh: string; en: string }> = {
  abrasive: { zh: '磨砂（物理去角质）', en: 'abrasive' },
  absorbent: { zh: '吸附油脂或水分', en: 'absorbs oil or water' },
  adhesive: { zh: '黏合', en: 'adhesive' },
  'anti-seborrheic': { zh: '抑制皮脂过多', en: 'helps control excess sebum' },
  'anti-sebum': { zh: '控油', en: 'controls oil' },
  anticaking: { zh: '防结块', en: 'anti-caking' },
  anticorrosive: { zh: '防止包装腐蚀', en: 'prevents packaging corrosion' },
  antifoaming: { zh: '消泡', en: 'reduces foam' },
  antimicrobial: { zh: '抑制微生物', en: 'antimicrobial' },
  antioxidant: { zh: '抗氧化（防止配方变质）', en: 'antioxidant (keeps the formula from going off)' },
  antiperspirant: { zh: '止汗', en: 'antiperspirant' },
  antiplaque: { zh: '抗牙菌斑', en: 'anti-plaque' },
  antistatic: { zh: '抗静电（减少头发飘起）', en: 'antistatic (reduces flyaways)' },
  astringent: { zh: '收敛', en: 'astringent' },
  binding: { zh: '黏合成型', en: 'binding' },
  bleaching: { zh: '漂白提亮', en: 'bleaching' },
  buffering: { zh: '调节和稳定酸碱度', en: 'adjusts and stabilises pH' },
  bulking: { zh: '填充', en: 'bulking agent' },
  chelating: { zh: '螯合（结合水中的钙镁等金属离子）', en: 'chelating (binds calcium, magnesium and other metal ions)' },
  cleansing: { zh: '清洁', en: 'cleansing' },
  colorant: { zh: '着色（给产品上色）', en: 'colours the product' },
  denaturant: { zh: '变性剂（让酒精不能饮用）', en: 'denaturant (makes alcohol undrinkable)' },
  deodorant: { zh: '除臭', en: 'deodorant' },
  depilatory: { zh: '脱毛', en: 'depilatory' },
  detangling: { zh: '顺发（减少打结）', en: 'detangling' },
  'dispersing non-surfactant': { zh: '帮助分散', en: 'dispersing' },
  'emulsion stabilising': { zh: '稳定乳液（防止油水分层）', en: 'keeps emulsions from separating' },
  epilating: { zh: '脱毛', en: 'epilating' },
  exfoliating: { zh: '去角质', en: 'exfoliating' },
  'eyelash conditioning': { zh: '护理睫毛', en: 'eyelash conditioning' },
  'film forming': { zh: '成膜（在头发或皮肤表面形成薄膜）', en: 'film forming (leaves a thin film on hair or skin)' },
  flavouring: { zh: '调味', en: 'flavouring' },
  foaming: { zh: '起泡', en: 'foaming' },
  fragrance: { zh: '香料', en: 'fragrance' },
  'gel forming': { zh: '形成凝胶', en: 'gel forming' },
  'hair conditioning': { zh: '调理头发（让头发顺滑、好梳理）', en: 'hair conditioning (smoother, easier to comb)' },
  'hair dyeing': { zh: '染发', en: 'hair dyeing' },
  'hair fixing': { zh: '定型', en: 'hair fixing' },
  'hair waving or straightening': { zh: '烫发或拉直', en: 'waving or straightening' },
  humectant: { zh: '保湿（吸住水分）', en: 'humectant (holds water)' },
  keratolytic: { zh: '软化角质（帮助去除皮屑）', en: 'keratolytic (helps loosen flakes)' },
  'light stabilizer': { zh: '防止配方见光变质', en: 'protects the formula from light' },
  lytic: { zh: '溶解', en: 'lytic' },
  moisturising: { zh: '保湿', en: 'moisturising' },
  'nail conditioning': { zh: '护理指甲', en: 'nail conditioning' },
  'nail sculpting': { zh: '美甲塑形', en: 'nail sculpting' },
  'not reported': { zh: '未登记功能', en: 'not reported' },
  opacifying: { zh: '让产品不透明（珠光或乳白外观）', en: 'makes the product opaque' },
  'oral care': { zh: '口腔护理', en: 'oral care' },
  oxidising: { zh: '氧化', en: 'oxidising' },
  pearlescent: { zh: '珠光效果', en: 'pearlescent' },
  perfuming: { zh: '加香', en: 'perfuming' },
  'ph adjusters': { zh: '调节酸碱度', en: 'adjusts pH' },
  plasticiser: { zh: '增塑（让膜更柔韧）', en: 'plasticiser' },
  preservative: { zh: '防腐', en: 'preservative' },
  propellant: { zh: '推进剂（喷雾用）', en: 'propellant' },
  reducing: { zh: '还原', en: 'reducing' },
  refatting: { zh: '补充油脂（减轻清洁后的干涩）', en: 'refatting (offsets dryness after cleansing)' },
  refreshing: { zh: '清凉', en: 'refreshing / cooling' },
  'skin conditioning': { zh: '护肤调理', en: 'skin conditioning' },
  'skin conditioning - emollient': { zh: '润肤（让皮肤柔软）', en: 'emollient (softens skin)' },
  'skin conditioning - humectant': { zh: '保湿（吸住水分）', en: 'humectant (holds water)' },
  'skin conditioning - miscellaneous': { zh: '护肤调理', en: 'skin conditioning' },
  'skin conditioning - occlusive': { zh: '封闭保湿（减少水分流失）', en: 'occlusive (reduces water loss)' },
  'skin protecting': { zh: '保护皮肤', en: 'skin protecting' },
  'slip modifier': { zh: '改善顺滑感', en: 'slip modifier' },
  smoothing: { zh: '让表面更平滑', en: 'smoothing' },
  solvent: { zh: '溶剂（溶解其他成分）', en: 'solvent' },
  soothing: { zh: '舒缓', en: 'soothing' },
  'surface modifier': { zh: '改善表面性质', en: 'surface modifier' },
  surfactant: { zh: '表面活性剂', en: 'surfactant' },
  'surfactant - cleansing': { zh: '清洁型表面活性剂（洗去油脂和污垢）', en: 'cleansing surfactant' },
  'surfactant - dispersing': { zh: '分散型表面活性剂', en: 'dispersing surfactant' },
  'surfactant - emulsifying': { zh: '乳化（让油和水混合）', en: 'emulsifier (mixes oil and water)' },
  'surfactant - foam boosting': { zh: '增加泡沫', en: 'foam booster' },
  'surfactant - hydrotrope': { zh: '助溶', en: 'hydrotrope' },
  'surfactant - solubilizing': { zh: '增溶（让油性成分溶于水）', en: 'solubiliser' },
  tanning: { zh: '美黑', en: 'tanning' },
  tonic: { zh: '提神', en: 'tonic' },
  'uv absorber': { zh: '吸收紫外线（保护产品）', en: 'UV absorber (protects the product)' },
  'uv filter': { zh: '防晒（紫外线过滤）', en: 'UV filter' },
  'viscosity controlling': { zh: '调节稠度', en: 'controls thickness' },
};

/** 翻译一组 CosIng 功能并去重（如 humectant 与 skin conditioning - humectant 译文相同） */
export function translateCosingFunctions(fns: string[], lang: 'zh' | 'en'): string[] {
  const out: string[] = [];
  for (const f of fns) {
    const text = COSING_FUNCTIONS[f.toLowerCase()]?.[lang] ?? f;
    if (!out.includes(text)) out.push(text);
  }
  return out;
}

/** 测试用：未收录的功能名 */
export function untranslatedFunctions(fns: string[]): string[] {
  return [...new Set(fns.filter((f) => !COSING_FUNCTIONS[f.toLowerCase()]))];
}
