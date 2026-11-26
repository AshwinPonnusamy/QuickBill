-- QuickBill: Seed 6 Categories + 56 General Retail Products into Supabase
-- Run this script in: Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- By default, it picks your latest business from `public.businesses`.
-- If you have multiple businesses, replace the SELECT with your exact UUID:
--   v_business_id := '00000000-0000-0000-0000-000000000000';

DO $$
DECLARE
  v_business_id UUID;
  v_cat_bev UUID;
  v_cat_gro UUID;
  v_cat_snk UUID;
  v_cat_per UUID;
  v_cat_hom UUID;
  v_cat_stn UUID;
BEGIN
  SELECT id INTO v_business_id
  FROM public.businesses
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'No business found in public.businesses. Create a business in the app first.';
  END IF;

  -- 1. Ensure 6 general retail categories exist
  INSERT INTO public.categories (business_id, name, is_active)
  SELECT v_business_id, c.name, TRUE
  FROM (
    VALUES
      ('Beverages & Drinks'),
      ('Grocery & Staples'),
      ('Snacks & Biscuits'),
      ('Personal Care'),
      ('Home Care & Cleaning'),
      ('Stationery & General')
  ) AS c(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories existing
    WHERE existing.business_id = v_business_id
      AND LOWER(existing.name) = LOWER(c.name)
  );

  SELECT id INTO v_cat_bev FROM public.categories WHERE business_id = v_business_id AND LOWER(name) = 'beverages & drinks' LIMIT 1;
  SELECT id INTO v_cat_gro FROM public.categories WHERE business_id = v_business_id AND LOWER(name) = 'grocery & staples' LIMIT 1;
  SELECT id INTO v_cat_snk FROM public.categories WHERE business_id = v_business_id AND LOWER(name) = 'snacks & biscuits' LIMIT 1;
  SELECT id INTO v_cat_per FROM public.categories WHERE business_id = v_business_id AND LOWER(name) = 'personal care' LIMIT 1;
  SELECT id INTO v_cat_hom FROM public.categories WHERE business_id = v_business_id AND LOWER(name) = 'home care & cleaning' LIMIT 1;
  SELECT id INTO v_cat_stn FROM public.categories WHERE business_id = v_business_id AND LOWER(name) = 'stationery & general' LIMIT 1;

  -- 2. Insert 56 general retail products (skips duplicates by name for this business)
  INSERT INTO public.products (
    business_id,
    category_id,
    name,
    sku,
    selling_price_paise,
    purchase_price_paise,
    unit,
    tax_rate,
    is_tax_inclusive,
    stock_quantity,
    low_stock_threshold,
    is_favourite,
    is_active
  )
  SELECT
    v_business_id,
    p.category_id,
    p.name,
    p.sku,
    p.selling_price_paise,
    p.purchase_price_paise,
    p.unit,
    p.tax_rate,
    p.is_tax_inclusive,
    p.stock_quantity,
    p.low_stock_threshold,
    p.is_favourite,
    TRUE
  FROM (
    VALUES
      -- 1. Beverages & Drinks (8)
      (v_cat_bev, 'Mineral Water (1L)', 'BEV-001', 2000, 1200, 'item', 18.00, TRUE, 96, 20, TRUE),
      (v_cat_bev, 'Mineral Water (500ml)', 'BEV-002', 1000, 600, 'item', 18.00, TRUE, 120, 24, TRUE),
      (v_cat_bev, 'Cola Soft Drink (750ml)', 'BEV-003', 4000, 3200, 'item', 28.00, TRUE, 48, 12, TRUE),
      (v_cat_bev, 'Mango Fruit Drink (200ml)', 'BEV-004', 1000, 800, 'packet', 12.00, TRUE, 72, 15, FALSE),
      (v_cat_bev, 'Lemon Soda (600ml)', 'BEV-005', 3500, 2800, 'item', 28.00, TRUE, 36, 10, FALSE),
      (v_cat_bev, 'Tea Dust Pack (250g)', 'BEV-006', 11500, 9600, 'packet', 5.00, TRUE, 30, 8, FALSE),
      (v_cat_bev, 'Instant Coffee Jar (50g)', 'BEV-007', 14500, 12200, 'item', 18.00, TRUE, 24, 6, FALSE),
      (v_cat_bev, 'Health Drink Refill (500g)', 'BEV-008', 24000, 20500, 'packet', 18.00, TRUE, 18, 5, FALSE),

      -- 2. Grocery & Staples (12)
      (v_cat_gro, 'Ponni Boiled Rice (1kg)', 'GRO-001', 6500, 5400, 'kg', 0.00, TRUE, 50, 10, TRUE),
      (v_cat_gro, 'Basmati Rice (1kg)', 'GRO-002', 12500, 10200, 'kg', 5.00, TRUE, 35, 8, FALSE),
      (v_cat_gro, 'Toor Dal (1kg)', 'GRO-003', 15500, 13200, 'kg', 0.00, TRUE, 30, 8, TRUE),
      (v_cat_gro, 'Moong Dal (1kg)', 'GRO-004', 13000, 11000, 'kg', 0.00, TRUE, 25, 6, FALSE),
      (v_cat_gro, 'Urad Dal (1kg)', 'GRO-005', 14500, 12200, 'kg', 0.00, TRUE, 25, 6, FALSE),
      (v_cat_gro, 'Chana Dal (1kg)', 'GRO-006', 9500, 7800, 'kg', 0.00, TRUE, 30, 8, FALSE),
      (v_cat_gro, 'Whole Wheat Atta (5kg)', 'GRO-007', 24500, 20500, 'packet', 5.00, TRUE, 22, 5, FALSE),
      (v_cat_gro, 'Refined Sunflower Oil (1L)', 'GRO-008', 13500, 11800, 'liter', 5.00, TRUE, 40, 10, TRUE),
      (v_cat_gro, 'Groundnut Oil (1L)', 'GRO-009', 19500, 17000, 'liter', 5.00, TRUE, 20, 5, FALSE),
      (v_cat_gro, 'Iodized Salt (1kg)', 'GRO-010', 2800, 2100, 'packet', 0.00, TRUE, 60, 12, FALSE),
      (v_cat_gro, 'White Sugar (1kg)', 'GRO-011', 4800, 4100, 'kg', 5.00, TRUE, 45, 10, TRUE),
      (v_cat_gro, 'Instant Noodles Pack', 'GRO-012', 1400, 1150, 'packet', 18.00, TRUE, 80, 15, TRUE),

      -- 3. Snacks & Biscuits (10)
      (v_cat_snk, 'Marie Gold Biscuits', 'SNK-001', 1000, 800, 'packet', 18.00, TRUE, 80, 15, TRUE),
      (v_cat_snk, 'Butter Cookies Pack', 'SNK-002', 2000, 1600, 'packet', 18.00, TRUE, 60, 12, FALSE),
      (v_cat_snk, 'Glucose Biscuits', 'SNK-003', 1000, 800, 'packet', 18.00, TRUE, 90, 20, TRUE),
      (v_cat_snk, 'Cream Wafer Biscuits', 'SNK-004', 2000, 1500, 'packet', 18.00, TRUE, 50, 10, FALSE),
      (v_cat_snk, 'Salted Potato Chips', 'SNK-005', 2000, 1500, 'packet', 12.00, TRUE, 70, 15, FALSE),
      (v_cat_snk, 'Masala Corn Puffs', 'SNK-006', 1000, 750, 'packet', 12.00, TRUE, 65, 12, FALSE),
      (v_cat_snk, 'Madras Mixture (250g)', 'SNK-007', 6500, 4800, 'packet', 12.00, TRUE, 32, 8, FALSE),
      (v_cat_snk, 'Roasted Peanuts (100g)', 'SNK-008', 3000, 2200, 'packet', 12.00, TRUE, 40, 8, FALSE),
      (v_cat_snk, 'Milk Chocolate Bar', 'SNK-009', 2000, 1600, 'item', 18.00, TRUE, 60, 12, FALSE),
      (v_cat_snk, 'Fruit Jam Jar (200g)', 'SNK-010', 7500, 6000, 'item', 12.00, TRUE, 20, 5, FALSE),

      -- 4. Personal Care (10)
      (v_cat_per, 'Herbal Bath Soap (100g)', 'PER-001', 3800, 3000, 'item', 18.00, TRUE, 48, 10, TRUE),
      (v_cat_per, 'Moisturizing Soap Pack (3x100g)', 'PER-002', 11000, 9000, 'packet', 18.00, TRUE, 24, 6, FALSE),
      (v_cat_per, 'Mint Toothpaste (100g)', 'PER-003', 6200, 5000, 'item', 18.00, TRUE, 32, 8, FALSE),
      (v_cat_per, 'Soft Toothbrush', 'PER-004', 3000, 2000, 'item', 18.00, TRUE, 40, 10, FALSE),
      (v_cat_per, 'Anti-Dandruff Shampoo (180ml)', 'PER-005', 14500, 11800, 'item', 18.00, TRUE, 20, 5, FALSE),
      (v_cat_per, 'Coconut Hair Oil (100ml)', 'PER-006', 5500, 4400, 'item', 18.00, TRUE, 30, 8, FALSE),
      (v_cat_per, 'Talcum Powder (100g)', 'PER-007', 8500, 6800, 'item', 18.00, TRUE, 22, 5, FALSE),
      (v_cat_per, 'Hand Wash Refill (200ml)', 'PER-008', 7500, 5800, 'packet', 18.00, TRUE, 25, 6, FALSE),
      (v_cat_per, 'Shaving Razor Pack', 'PER-009', 4500, 3400, 'packet', 18.00, TRUE, 28, 6, FALSE),
      (v_cat_per, 'Cotton Buds Box', 'PER-010', 3500, 2400, 'box', 12.00, TRUE, 30, 8, FALSE),

      -- 5. Home Care & Cleaning (8)
      (v_cat_hom, 'Detergent Powder (1kg)', 'HOM-001', 9800, 8000, 'packet', 18.00, TRUE, 28, 6, TRUE),
      (v_cat_hom, 'Liquid Detergent (500ml)', 'HOM-002', 12500, 10200, 'item', 18.00, TRUE, 20, 5, FALSE),
      (v_cat_hom, 'Lemon Dishwash Bar', 'HOM-003', 2000, 1500, 'item', 18.00, TRUE, 50, 12, FALSE),
      (v_cat_hom, 'Dishwash Gel (250ml)', 'HOM-004', 6500, 5200, 'item', 18.00, TRUE, 24, 6, FALSE),
      (v_cat_hom, 'Floor Cleaner Pine (500ml)', 'HOM-005', 9500, 7600, 'item', 18.00, TRUE, 22, 5, FALSE),
      (v_cat_hom, 'Toilet Cleaner (500ml)', 'HOM-006', 9900, 8000, 'item', 18.00, TRUE, 24, 6, FALSE),
      (v_cat_hom, 'Stainless Steel Scrubber', 'HOM-007', 2000, 1300, 'item', 18.00, TRUE, 45, 10, FALSE),
      (v_cat_hom, 'Sandal Agarbatti Pack', 'HOM-008', 2500, 1700, 'box', 5.00, TRUE, 40, 10, FALSE),

      -- 6. Stationery & General (8)
      (v_cat_stn, 'A4 Ruled Notebook (172 Pages)', 'STN-001', 6000, 4500, 'item', 12.00, TRUE, 36, 8, FALSE),
      (v_cat_stn, 'Ballpoint Pen (Blue)', 'STN-002', 1000, 700, 'item', 18.00, TRUE, 100, 20, FALSE),
      (v_cat_stn, 'Permanent Marker', 'STN-003', 2500, 1800, 'item', 18.00, TRUE, 30, 8, FALSE),
      (v_cat_stn, 'Adhesive Glue Stick', 'STN-004', 3000, 2100, 'item', 18.00, TRUE, 25, 6, FALSE),
      (v_cat_stn, 'Cello Tape Roll', 'STN-005', 2500, 1700, 'item', 18.00, TRUE, 35, 8, FALSE),
      (v_cat_stn, 'AA Alkaline Battery (Pack of 2)', 'STN-006', 4000, 3000, 'packet', 18.00, TRUE, 40, 10, FALSE),
      (v_cat_stn, '9W LED Bulb', 'STN-007', 9500, 7200, 'item', 18.00, TRUE, 24, 6, FALSE),
      (v_cat_stn, 'Safety Matchbox (Pack of 10)', 'STN-008', 2000, 1400, 'packet', 12.00, TRUE, 50, 10, FALSE)
  ) AS p(
    category_id,
    name,
    sku,
    selling_price_paise,
    purchase_price_paise,
    unit,
    tax_rate,
    is_tax_inclusive,
    stock_quantity,
    low_stock_threshold,
    is_favourite
  )
  WHERE NOT EXISTS (
    SELECT 1 FROM public.products existing
    WHERE existing.business_id = v_business_id
      AND LOWER(existing.name) = LOWER(p.name)
  );
END $$;
