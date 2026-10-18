# skincare (working name)

[中文](README.md)

A free, open-source tool that recommends scalp and hair products based on ingredients, your needs and your city's water. Every score is explained. No ads, no affiliate links, and the scoring rules are public. Recommendations come from fixed rules, not AI.

## What it does

- A short quiz covers your scalp (oiliness, dandruff, itch, redness, hair loss), your hair (thickness, texture, damage), the effects you want, fragrance preference, budget and city.
- Products are scored on four dimensions: need match (50%), irritation risk (25%), evidence (15%) and environment, meaning water hardness (10%). A dimension that does not apply to you, or has no data, is left out and the remaining weights are renormalized.
- Each product card shows two short reasons, the price and size, and a purchase link. The details list the score for each dimension, the support for each claim, fragrance information, ingredients with plain-language explanations, and usage notes.
- Results include shampoos, conditioners, and a shampoo + conditioner set that fits a total budget.
- Health notes ("consider seeing a dermatologist") appear for certain scalp answers. They never name a disease.

Details: [docs/SCORING.md](docs/SCORING.md) (scoring), [docs/QUIZ.md](docs/QUIZ.md) (questions and mappings) and [docs/PRODUCT.md](docs/PRODUCT.md) (product plan). These documents are in Chinese.

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

Requires Node.js 20 or later.

```bash
npm install
npm run dev                  # local preview
npm test                     # tests
npm run validate-data        # check the CSV files in data/
npm run coverage             # regenerate docs/COVERAGE.md (needs × budget tiers); run after every data update
npm run ingredient-review    # regenerate docs/INGREDIENT_REVIEW.md (ingredients that affect scoring)
npm run ingredient-frequency # ingredient frequency across products
npm run import-cosing -- <file>  # build data/cosing_ingredients.csv from a CosIng export
npm run build                # build the static site into dist/
```

Stack: Vite + React + TypeScript. The site reads `data/*.csv` at build time. It is deployed as a static site on Cloudflare Pages; see [docs/DEPLOY.md](docs/DEPLOY.md).

## Status

v0.1 covers scalp and hair (shampoo, conditioner, sets) for US users, with Chinese and English interfaces. Pre-launch ingredient review is in progress. The disclaimer and privacy notes are on the site's /about page.

## License

Code: MIT. Data compiled by the author: CC BY 4.0. Third-party data keeps its original license.
