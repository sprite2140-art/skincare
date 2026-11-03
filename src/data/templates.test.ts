// docs/templates/ 里的标准表头必须与 data/ 中的表一致（交给数据收集方时用最新版本，避免列数不一致）
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const header = (path: string) => readFileSync(path, 'utf8').replace(/^﻿/, '').split(/\r?\n/)[0];

describe('标准表头 docs/templates', () => {
  for (const name of ['products', 'purchase_links', 'retail_ratings']) {
    it(name, () => {
      expect(header(`docs/templates/${name}_header.csv`)).toBe(header(`data/${name}.csv`));
    });
  }
});
