# 数据表标准表头

交给数据收集方（ChatGPT）新批次时，用这里的表头，列名和顺序必须完全一致：

- `products_header.csv`：data/products.csv，51 列（2026-11-03；比旧的 50 列模板多 `inclusion_basis_type`，放在 `inclusion_basis` 后面）
- `purchase_links_header.csv`：data/purchase_links.csv
- `retail_ratings_header.csv`：data/retail_ratings.csv

各列的含义和取值见 `docs/DATA_SCHEMA.md`。产品表改列时，这里的文件要同步更新；`src/data/templates.test.ts` 会检查两边是否一致。
