# skincare (working name)

[中文](README.md)

A free, open-source tool that recommends scalp, hair and face skincare products based on ingredients, your needs and your city's climate and water. Every score is explained. No ads, no affiliate links, and the scoring rules are public. Recommendations come from fixed rules, not AI.

## What it does

**Hair care (shampoo and conditioner)**

- A short quiz covers your scalp (oiliness, dandruff, itch, redness, hair loss), your hair (thickness, texture, damage), the effects you want, fragrance preference, budget and city.
- Products are scored on four dimensions: need match (50%), irritation risk (25%), evidence (15%) and environment, meaning water hardness (10%). A dimension that does not apply to you, or has no data, is left out and the remaining weights are renormalized.
- Results include shampoos, conditioners, and a shampoo + conditioner set that fits a total budget.

**Face skincare**

- A separate quiz covers skin type, sensitivity, up to three ranked concerns (breakouts, oiliness, dryness, redness, dark spots, fine lines, visible pores), makeup, time outdoors, sweating or swimming, special situations (pregnancy, trying to conceive, breastfeeding, prescription topicals or oral isotretinoin), fragrance preference and budget.
- It builds the fewest steps that work together, following the American Academy of Dermatology's basic order (cleanse → treatment → moisturizer and sunscreen), with separate morning and evening routines. Categories: cleanser, moisturizer, serum, sunscreen, exfoliator and spot treatment.
- Concerns are weighted 3 / 2 / 1 by your ranking. Combinations of actives that should not be layered are flagged, and products that conflict with a special situation (for example retinoids during pregnancy) are left out with the reason shown. Water hardness is not used for face products.

**Both**

- Each product card shows two short reasons, the price and size, and a purchase link. The details list the score for each dimension, the support for each claim, fragrance information, ingredients with plain-language explanations, and usage notes.
- Health notes ("consider seeing a dermatologist") appear for certain answers, such as a red, painful scalp or widespread, painful breakouts. They never name a disease.

Details: [docs/SCORING.md](docs/SCORING.md) (scoring), [docs/QUIZ.md](docs/QUIZ.md) (hair quiz), [docs/SKIN_QUIZ_DRAFT.md](docs/SKIN_QUIZ_DRAFT.md) (skincare quiz and rules) and [docs/PRODUCT.md](docs/PRODUCT.md) (product plan). These documents are in Chinese.

## Data principles

- Scoring uses only reviewed ingredients, or basic ingredients that need no review. Test mode (`TEST_MODE_DRAFT_SCORING` in `src/scoring/config.ts`) also uses draft data and labels it on the page. **Test mode must be turned off before launch.**
- EU CosIng function data is shown only to explain ingredients. It is never used directly to score or filter products. Decisions such as "is this a fragrance ingredient?" or "is this a chelating agent?" use lists maintained in this repository.
- Brand claims and our own data classification are labeled separately. Neither is treated as a verified effect.
- Profiles are stored only in the browser (localStorage). Nothing is uploaded.

## Repository layout

- `data/products.csv` products (one row = one product's formula in one sales region)
- `data/ingredients.csv` ingredient knowledge base; `data/ingredient_explanations.csv` draft plain-language explanations
- `data/cosing_ingredients.csv` EU CosIng inventory (display only); `data/eu_fragrance_allergens.csv` EU fragrance allergens
- `data/chelators.csv`, `data/fragrance_ingredients.csv` lists maintained in this repository and used for decisions
- `data/cities.csv`, `data/water_hardness.csv`, `data/water_hardness_reference.csv` cities and water hardness
- `data/exchange_rates.csv` fixed exchange rates (US Federal Reserve H.10)
- `src/scoring/` scoring rules (fixed rules, no AI); `src/data/` CSV parsing and validation; `src/profile/` quiz answers and local profiles; `src/pages/` pages
- `docs/` data schema, scoring rules, deployment, progress log, coverage table and ingredient review table

## Development

Requires Node.js 22.12 or later (see `.node-version`).

```bash
npm install
npm run dev                  # local preview
npm test                     # tests
npm run validate-data        # check the CSV files in data/
npm run coverage             # regenerate docs/COVERAGE.md (needs × price ranges); run after every data update
npm run ingredient-review    # regenerate docs/INGREDIENT_REVIEW.md (ingredients that affect scoring)
npm run ingredient-frequency # ingredient frequency across products
npm run import-cosing -- <file>  # build data/cosing_ingredients.csv from a CosIng export
npm run build                # build the static site into dist/
```

Stack: Vite + React + TypeScript. The site reads `data/*.csv` at build time. It is deployed as a static site on Cloudflare Pages; see [docs/DEPLOY.md](docs/DEPLOY.md).

## Status

v0.1 covers scalp and hair (shampoo, conditioner, sets) and face skincare (cleanser, moisturizer, serum, sunscreen, exfoliator, spot treatment, with AM/PM routines) for US users, with Chinese and English interfaces. Test mode was turned off on 2026-10-29; the pre-launch audit is in [docs/LAUNCH_AUDIT.md](docs/LAUNCH_AUDIT.md) (Chinese). The disclaimer and privacy notes are on the site's /about page; how scores and data are judged is explained on /data.

## Contributing

Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md) for the data sourcing rules. Please report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

- Code: MIT, see [LICENSE](LICENSE).
- Data compiled by the authors: CC BY 4.0. Third-party data (CosIng, EU regulations, Federal Reserve exchange rates, Open Beauty Facts images and others) follows its original terms and is credited. See [DATA_LICENSE.md](DATA_LICENSE.md).
