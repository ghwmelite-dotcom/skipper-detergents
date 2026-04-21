-- ============================================================
-- Skipper Detergents — seed data (development)
-- Run AFTER schema.sql. Safe to re-run: uses INSERT OR IGNORE / OR REPLACE.
-- ============================================================

-- ------------------------------------------------------------
-- STORE SETTINGS
-- ------------------------------------------------------------
INSERT OR REPLACE INTO store_settings (key, value) VALUES
  ('store_name', 'Skipper Detergents'),
  ('store_tagline', 'Premium Cleaning & Bathroom Essentials'),
  ('store_email', 'orders@skipperdetergents.com.gh'),
  ('store_phone', '+233 20 000 0000'),
  ('currency', 'GHS'),
  ('tax_rate', '0'),
  ('delivery_fee_accra', '15'),
  ('delivery_fee_other', '35'),
  ('free_delivery_threshold', '200'),
  ('manual_payment_details', 'MTN MoMo: 024 000 0000 / GCB Bank: 1234567890 — Skipper Detergents Ltd'),
  ('pickup_address', 'TBD — enter in Admin Settings after launch'),
  ('paystack_public_key', ''),
  ('paystack_secret_key', '');

-- ------------------------------------------------------------
-- DELIVERY ZONES
-- ------------------------------------------------------------
INSERT OR IGNORE INTO delivery_zones (id, name, regions, fee, estimated_days, is_active) VALUES
  ('zone_accra', 'Greater Accra', '["Greater Accra"]', 15, '1-2 days', 1),
  ('zone_other', 'Other Regions', '["Ashanti","Volta","Central","Eastern","Western","Northern","Upper East","Upper West","Bono","Ahafo","Bono East","Oti","Savannah","North East","Western North"]', 35, '3-5 days', 1);

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order, seo_title, seo_description) VALUES
  ('cat_detergents', 'Detergents & Laundry', 'detergents-laundry', 'Premium liquid and powder detergents, fabric softeners, and stain removers.', 1, 'Buy Detergents Online in Ghana | Skipper Detergents', 'Shop premium liquid & powder detergents with fast Accra delivery. Bulk pricing available for offices and households.'),
  ('cat_toilet', 'Toilet Paper & Rolls', 'toilet-paper', 'Soft, strong, quilted toilet rolls for home and office.', 2, 'Toilet Paper & Rolls Online | Skipper Detergents Ghana', 'Order toilet rolls online in Ghana. Single packs and bulk cartons with fast delivery across Accra and beyond.'),
  ('cat_tissue', 'Tissue Paper', 'tissue-paper', 'Facial and pocket tissues for every room.', 3, 'Tissue Paper Ghana | Skipper Detergents', 'Buy facial and pocket tissue paper online. Bulk discounts for offices, schools, and hospitality.'),
  ('cat_paper_towels', 'Paper Towels', 'paper-towels', 'Kitchen rolls and heavy-duty paper towels.', 4, 'Paper Towels Online Ghana | Skipper Detergents', 'Kitchen paper towels and industrial rolls delivered across Ghana.'),
  ('cat_bathroom', 'Bathroom Accessories', 'bathroom-accessories', 'Toilet brushes, soap dispensers, bathroom mats, and more.', 5, 'Bathroom Accessories Ghana | Skipper Detergents', 'Shop bathroom accessories online — dispensers, brushes, mats.'),
  ('cat_surface', 'Surface Cleaners', 'surface-cleaners', 'All-purpose cleaners, glass cleaners, floor disinfectants.', 6, 'Surface Cleaners Ghana | Skipper Detergents', 'Disinfectants and surface cleaners for every home and office.');

-- ------------------------------------------------------------
-- PRODUCTS (12 sample SKUs — mix of Skipper and resold brands)
-- ------------------------------------------------------------
INSERT OR IGNORE INTO products (
  id, name, slug, description, short_description, category_id, brand, sku,
  unit_price, compare_at_price, stock_quantity, low_stock_threshold, weight_kg,
  is_active, is_featured, is_bulk_available, bulk_minimum_qty, tags,
  seo_title, seo_description, seo_keywords
) VALUES
  ('prod_skipper_2l', 'Skipper Liquid Detergent 2L', 'skipper-liquid-detergent-2l', 'Our flagship concentrated liquid detergent. Tough on stains, gentle on fabrics. Suitable for both hand and machine wash. Fresh ocean scent.', 'Concentrated liquid detergent, 2L, ocean scent.', 'cat_detergents', 'Skipper', 'SK-LIQ-2L', 45.00, 55.00, 240, 20, 2.1, 1, 1, 1, 10, 'liquid,detergent,laundry,fresh,skipper', 'Skipper Liquid Detergent 2L | Buy Online Ghana', 'Our flagship 2L concentrated liquid detergent. Free Accra delivery over GHS 200. Bulk pricing available.', 'liquid detergent ghana, skipper detergent'),
  ('prod_skipper_pw', 'Skipper Powder Detergent 4kg', 'skipper-powder-detergent-4kg', 'Heavy-duty powder detergent for the toughest loads. 4kg family pack. Stain-lifting enzymes and brighteners.', '4kg powder detergent, family pack.', 'cat_detergents', 'Skipper', 'SK-PWD-4KG', 68.00, 85.00, 180, 15, 4.2, 1, 1, 1, 5, 'powder,detergent,laundry,skipper,family', 'Skipper Powder Detergent 4kg Ghana', 'Shop Skipper powder detergent 4kg online. Bulk discounts for 5+ packs.', 'powder detergent ghana, skipper 4kg'),
  ('prod_ariel_3kg', 'Ariel Powder Detergent 3kg', 'ariel-powder-detergent-3kg', 'Trusted stain-removal power from Ariel. 3kg pack for regular laundry.', 'Ariel powder detergent, 3kg.', 'cat_detergents', 'Ariel', 'AR-PWD-3KG', 62.00, NULL, 95, 10, 3.2, 1, 0, 1, 5, 'ariel,powder,detergent,laundry', 'Ariel Powder Detergent 3kg Ghana | Skipper Detergents', 'Buy Ariel powder detergent 3kg online in Ghana.', 'ariel ghana, ariel 3kg'),
  ('prod_omo_2l', 'Omo Liquid Detergent 2L', 'omo-liquid-detergent-2l', 'Omo 2L liquid — the household standard.', 'Omo liquid detergent, 2L.', 'cat_detergents', 'Omo', 'OM-LIQ-2L', 44.00, NULL, 140, 10, 2.1, 1, 0, 1, 10, 'omo,liquid,detergent', 'Omo Liquid Detergent 2L Ghana', 'Buy Omo 2L liquid detergent online in Ghana.', 'omo detergent ghana'),
  ('prod_softcare_10', 'Softcare Toilet Roll — 10 Pack', 'softcare-toilet-roll-10-pack', 'Soft, strong, 2-ply toilet rolls. 10-pack for regular use.', '10-pack 2-ply toilet rolls.', 'cat_toilet', 'Softcare', 'SC-TR-10', 35.00, 42.00, 520, 40, 1.4, 1, 1, 1, 5, 'toilet roll,softcare,2-ply', 'Softcare Toilet Roll 10-Pack | Skipper Detergents Ghana', 'Buy Softcare toilet rolls 10-pack online. Bulk pricing on 5+ packs.', 'toilet roll ghana, softcare'),
  ('prod_skipper_tr24', 'Skipper Toilet Roll — 24 Pack Carton', 'skipper-toilet-roll-24-carton', 'Full carton of 24 premium Skipper toilet rolls. Soft, 3-ply, unscented.', '24-roll carton, 3-ply Skipper.', 'cat_toilet', 'Skipper', 'SK-TR-24', 78.00, 95.00, 210, 15, 3.5, 1, 1, 1, 5, 'toilet roll,skipper,carton,3-ply', 'Skipper 24-Roll Carton | Wholesale Ghana', 'Skipper 24-roll carton with wholesale pricing for offices.', 'skipper toilet roll, wholesale toilet roll ghana'),
  ('prod_premier_tissue', 'Premier Facial Tissue Box 200-Sheet', 'premier-facial-tissue-box-200-sheet', 'Premium 2-ply facial tissue box, 200 sheets.', '200-sheet facial tissue.', 'cat_tissue', 'Premier', 'PR-FT-200', 12.00, NULL, 680, 50, 0.28, 1, 0, 1, 20, 'tissue,facial,premier', 'Premier Facial Tissue 200-Sheet Ghana', 'Buy Premier facial tissue 200-sheet boxes online. Office bulk discounts.', 'facial tissue ghana'),
  ('prod_bounty_6', 'Bounty Kitchen Paper Towel 6-Roll', 'bounty-kitchen-paper-towel-6-roll', 'Absorbent heavy-duty kitchen rolls, 6-pack.', '6-pack kitchen paper towels.', 'cat_paper_towels', 'Bounty', 'BT-KP-6', 42.00, 50.00, 150, 12, 1.8, 1, 0, 1, 10, 'paper towel,bounty,kitchen', 'Bounty Kitchen Paper Towel 6-Pack Ghana', 'Bounty 6-pack kitchen rolls with bulk discounts available.', 'kitchen paper towel ghana'),
  ('prod_harpic', 'Harpic Toilet Cleaner 750ml', 'harpic-toilet-cleaner-750ml', 'Powerful toilet bowl cleaner. Kills 99.9% of germs.', '750ml toilet cleaner.', 'cat_surface', 'Harpic', 'HR-TC-750', 28.00, NULL, 220, 15, 0.85, 1, 0, 1, 12, 'harpic,cleaner,toilet,disinfectant', 'Harpic Toilet Cleaner 750ml Ghana', 'Harpic 750ml toilet cleaner online with Accra delivery.', 'harpic ghana, toilet cleaner'),
  ('prod_dettol_500', 'Dettol Surface Spray 500ml', 'dettol-surface-spray-500ml', 'All-surface disinfectant spray. Kills 99.9% of bacteria.', '500ml disinfectant spray.', 'cat_surface', 'Dettol', 'DE-SS-500', 32.00, NULL, 175, 12, 0.6, 1, 1, 0, 10, 'dettol,disinfectant,surface,spray', 'Dettol Surface Spray 500ml Ghana', 'Dettol 500ml all-surface disinfectant online in Ghana.', 'dettol surface spray ghana'),
  ('prod_bath_brush', 'Skipper Toilet Brush + Holder', 'skipper-toilet-brush-holder', 'Sleek minimalist toilet brush with self-draining holder.', 'Toilet brush with holder.', 'cat_bathroom', 'Skipper', 'SK-TB-01', 38.00, NULL, 90, 8, 0.45, 1, 0, 0, 10, 'toilet brush,bathroom,skipper', 'Skipper Toilet Brush + Holder Ghana', 'Skipper modern toilet brush and holder online in Ghana.', 'toilet brush ghana'),
  ('prod_soap_disp', 'Skipper Soap Dispenser 350ml', 'skipper-soap-dispenser-350ml', 'Refillable pump soap dispenser, 350ml, matte finish.', 'Refillable 350ml soap dispenser.', 'cat_bathroom', 'Skipper', 'SK-SD-350', 24.00, 32.00, 110, 10, 0.3, 1, 1, 0, 10, 'soap dispenser,bathroom,skipper', 'Skipper Soap Dispenser 350ml Ghana', 'Buy Skipper refillable soap dispensers online in Ghana.', 'soap dispenser ghana');

-- ------------------------------------------------------------
-- PRODUCT IMAGES (placeholder primary image per product)
-- ------------------------------------------------------------
INSERT OR IGNORE INTO product_images (id, product_id, url, alt_text, sort_order, is_primary) VALUES
  ('img_sk_2l', 'prod_skipper_2l', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Skipper+Liquid+2L', 'Skipper Liquid Detergent 2L bottle', 0, 1),
  ('img_sk_pw', 'prod_skipper_pw', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Skipper+Powder+4kg', 'Skipper Powder Detergent 4kg bag', 0, 1),
  ('img_ariel', 'prod_ariel_3kg', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Ariel+3kg', 'Ariel Powder Detergent 3kg bag', 0, 1),
  ('img_omo', 'prod_omo_2l', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Omo+2L', 'Omo Liquid Detergent 2L bottle', 0, 1),
  ('img_sc_10', 'prod_softcare_10', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Softcare+10-Pack', 'Softcare toilet roll 10-pack', 0, 1),
  ('img_sk_tr24', 'prod_skipper_tr24', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Skipper+24-Carton', 'Skipper 24-roll carton', 0, 1),
  ('img_premier', 'prod_premier_tissue', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Premier+Tissue', 'Premier facial tissue box', 0, 1),
  ('img_bounty', 'prod_bounty_6', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Bounty+6-Pack', 'Bounty kitchen paper towel 6-pack', 0, 1),
  ('img_harpic', 'prod_harpic', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Harpic+750ml', 'Harpic toilet cleaner 750ml', 0, 1),
  ('img_dettol', 'prod_dettol_500', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Dettol+Spray', 'Dettol surface spray 500ml', 0, 1),
  ('img_brush', 'prod_bath_brush', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Toilet+Brush', 'Skipper toilet brush with holder', 0, 1),
  ('img_disp', 'prod_soap_disp', 'https://placehold.co/800x800/0B2545/FCFBF7?text=Soap+Dispenser', 'Skipper soap dispenser 350ml', 0, 1);

-- ------------------------------------------------------------
-- BULK PRICING TIERS
-- ------------------------------------------------------------
INSERT OR IGNORE INTO bulk_pricing_tiers (id, product_id, min_quantity, max_quantity, unit_price, discount_percent, label) VALUES
  ('blk_sk2l_1', 'prod_skipper_2l', 10, 49, 38.00, 15, 'Bulk'),
  ('blk_sk2l_2', 'prod_skipper_2l', 50, NULL, 33.00, 27, 'Wholesale'),
  ('blk_skpw_1', 'prod_skipper_pw', 5, 19, 58.00, 15, 'Bulk'),
  ('blk_skpw_2', 'prod_skipper_pw', 20, NULL, 50.00, 26, 'Wholesale'),
  ('blk_ar_1', 'prod_ariel_3kg', 5, 19, 55.00, 11, 'Bulk'),
  ('blk_ar_2', 'prod_ariel_3kg', 20, NULL, 48.00, 23, 'Wholesale'),
  ('blk_omo_1', 'prod_omo_2l', 10, 49, 39.00, 11, 'Bulk'),
  ('blk_omo_2', 'prod_omo_2l', 50, NULL, 35.00, 20, 'Wholesale'),
  ('blk_sc_1', 'prod_softcare_10', 5, 19, 28.00, 20, 'Bulk'),
  ('blk_sc_2', 'prod_softcare_10', 20, NULL, 24.00, 31, 'Wholesale'),
  ('blk_tr24_1', 'prod_skipper_tr24', 5, 19, 68.00, 13, 'Bulk'),
  ('blk_tr24_2', 'prod_skipper_tr24', 20, NULL, 60.00, 23, 'Wholesale'),
  ('blk_pt_1', 'prod_premier_tissue', 20, 99, 9.50, 21, 'Office Bulk'),
  ('blk_pt_2', 'prod_premier_tissue', 100, NULL, 8.00, 33, 'Wholesale'),
  ('blk_bt_1', 'prod_bounty_6', 10, 49, 36.00, 14, 'Bulk'),
  ('blk_bt_2', 'prod_bounty_6', 50, NULL, 32.00, 24, 'Wholesale'),
  ('blk_hr_1', 'prod_harpic', 12, 49, 24.00, 14, 'Case'),
  ('blk_hr_2', 'prod_harpic', 50, NULL, 21.00, 25, 'Wholesale');

-- ------------------------------------------------------------
-- PRODUCT VARIANTS (couple of examples)
-- ------------------------------------------------------------
INSERT OR IGNORE INTO product_variants (id, product_id, name, sku, price_adjustment, stock_quantity, is_active) VALUES
  ('var_sk2l_1l', 'prod_skipper_2l', '1L Bottle', 'SK-LIQ-1L', -20, 300, 1),
  ('var_sk2l_5l', 'prod_skipper_2l', '5L Jug', 'SK-LIQ-5L', 45, 80, 1),
  ('var_disp_black', 'prod_soap_disp', 'Matte Black', 'SK-SD-350-BLK', 0, 55, 1),
  ('var_disp_white', 'prod_soap_disp', 'Matte White', 'SK-SD-350-WHT', 0, 55, 1);

-- Note: admin_users is NOT seeded here. The admin bootstrap utility
-- lives in milestone 5 (auth implementation) and writes a real
-- scrypt-hashed credential from ADMIN_EMAIL + ADMIN_PASSWORD env vars.
