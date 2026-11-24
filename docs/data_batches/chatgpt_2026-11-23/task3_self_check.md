# 其他地区链接/价格自查

**7款有修正，SH-KR-002、SH-CN-001、SH-CN-002尚未解决。** 保留原INCI、版本状态、其余历史字段；只修正链接、常规价格/币种、渠道、核对日及说明。不能用本次链接核对解除已有version_mismatch。

- SH-JP-001：link_price_patch；1848 JPY；400 mL pump; JAN4901301446183; tax included [商品页](https://www.matsukiyococokara-online.com/store/catalog/product/view/id/4901301446183)

- SH-JP-002：link_price_patch；1540 JPY；440 mL 2025 updated bottle; JAN4582521687732; tax included [商品页](https://www.matsukiyococokara-online.com/store/catalog/product/view/id/4582521687732)

- SH-JP-003：link_price_patch；1540 JPY；460 mL pump; JAN4582521686056; tax included [商品页](https://www.matsukiyococokara-online.com/store/catalog/product/view/id/4582521686056)

- SH-JP-004：link_price_patch；1430 JPY；Welcia storefront; 430 mL pump; JAN4901301455475; shown price excludes shipping/reward subtraction; search cache showed1496 but opened PDP shows1430 [商品页](https://store.shopping.yahoo.co.jp/ehac/4901301455475.html)

- SH-KR-001：link_price_patch；25000 KRW；400 mL single; regular25000, promotional18900 not used [商品页](https://www.amoremall.com/kr/ko/product/detail?onlineProdCode=110030000001&onlineProdSn=33872)

- SH-KR-003：link_price_patch；16000 KRW；180 mL single; water-first current formula, not old32.7% rosemary extract formula or400mL; card14880 not used [商品页](https://www.ssg.com/item/itemView.ssg?itemId=1000671665033)

- SH-KR-004：link_price_patch；29000 KRW；200 mL single; regular29000, promotional27000 not used [商品页](https://www.kurly.com/goods/5082156)

- SH-KR-002：unresolved； KRW；Found Kurly500mL shampoo+conditioner bundle; rejected division of bundle price. Single regular-price in-stock retailer page not verified.

- SH-CN-001：unresolved； CNY；Exact Chinese备案2025000158 product search yielded clearance/mixed packs; no verified single regular-price direct PDP.

- SH-CN-002：unresolved； CNY；Scored version is 80g; found400g+80g bundles, not a verified80g single regular-price PDP.

平台兼容性：现行DATA_SCHEMA.md的purchase_links.platform只列美国平台及brand，没有matsukiyococokara、yahoo_shopping、amoremall、ssg、kurly。这些如实保留当地平台代码，**属于待审核兼容项，不能谎标成Target/Walmart/brand**。本任务CSV结构仍为原6列；在网站支持当地平台之前，请仅审核task3，不直接导入其链接表。products50列导入同样需按列名处理，保留第51列现有值。

日本价格含税，不扣积分，不加地区运费；Essential直接页显示1430，搜索摘要曾显示1496，优先采用实际打开的商品页，说明中保留差异。LABO-H旧18900为促销，改常规25000；Rausch改常规29000，不用27000活动价。AROMATICA仅180mL水开头现配方，不挪用400mL或旧32.7%迷迭香版本价格。零售页可能缓存，均记listed，不声称实时库存已保证。此任务未新增评分，评分CSV仅有表头。
