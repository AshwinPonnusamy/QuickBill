import { ProductUnit } from '../types';

export interface StarterCatalogItem {
  categoryName: string;
  name: string;
  sku: string;
  sellingPricePaise: number;
  purchasePricePaise: number;
  unit: ProductUnit;
  taxRate: number;
  isTaxInclusive: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  isFavourite: boolean;
}

export const STARTER_CATEGORIES = [
  'Beverages & Drinks',
  'Grocery & Staples',
  'Snacks & Biscuits',
  'Personal Care',
  'Home Care & Cleaning',
  'Stationery & General',
] as const;

export const STARTER_CATALOG_PRODUCTS: StarterCatalogItem[] = [
  // 1. Beverages & Drinks (8)
  { categoryName: 'Beverages & Drinks', name: 'Mineral Water (1L)', sku: 'BEV-001', sellingPricePaise: 2000, purchasePricePaise: 1200, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 96, lowStockThreshold: 20, isFavourite: true },
  { categoryName: 'Beverages & Drinks', name: 'Mineral Water (500ml)', sku: 'BEV-002', sellingPricePaise: 1000, purchasePricePaise: 600, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 120, lowStockThreshold: 24, isFavourite: true },
  { categoryName: 'Beverages & Drinks', name: 'Cola Soft Drink (750ml)', sku: 'BEV-003', sellingPricePaise: 4000, purchasePricePaise: 3200, unit: 'item', taxRate: 28, isTaxInclusive: true, stockQuantity: 48, lowStockThreshold: 12, isFavourite: true },
  { categoryName: 'Beverages & Drinks', name: 'Mango Fruit Drink (200ml)', sku: 'BEV-004', sellingPricePaise: 1000, purchasePricePaise: 800, unit: 'packet', taxRate: 12, isTaxInclusive: true, stockQuantity: 72, lowStockThreshold: 15, isFavourite: false },
  { categoryName: 'Beverages & Drinks', name: 'Lemon Soda (600ml)', sku: 'BEV-005', sellingPricePaise: 3500, purchasePricePaise: 2800, unit: 'item', taxRate: 28, isTaxInclusive: true, stockQuantity: 36, lowStockThreshold: 10, isFavourite: false },
  { categoryName: 'Beverages & Drinks', name: 'Tea Dust Pack (250g)', sku: 'BEV-006', sellingPricePaise: 11500, purchasePricePaise: 9600, unit: 'packet', taxRate: 5, isTaxInclusive: true, stockQuantity: 30, lowStockThreshold: 8, isFavourite: false },
  { categoryName: 'Beverages & Drinks', name: 'Instant Coffee Jar (50g)', sku: 'BEV-007', sellingPricePaise: 14500, purchasePricePaise: 12200, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 24, lowStockThreshold: 6, isFavourite: false },
  { categoryName: 'Beverages & Drinks', name: 'Health Drink Refill (500g)', sku: 'BEV-008', sellingPricePaise: 24000, purchasePricePaise: 20500, unit: 'packet', taxRate: 18, isTaxInclusive: true, stockQuantity: 18, lowStockThreshold: 5, isFavourite: false },

  // 2. Grocery & Staples (12)
  { categoryName: 'Grocery & Staples', name: 'Ponni Boiled Rice (1kg)', sku: 'GRO-001', sellingPricePaise: 6500, purchasePricePaise: 5400, unit: 'kg', taxRate: 0, isTaxInclusive: true, stockQuantity: 50, lowStockThreshold: 10, isFavourite: true },
  { categoryName: 'Grocery & Staples', name: 'Basmati Rice (1kg)', sku: 'GRO-002', sellingPricePaise: 12500, purchasePricePaise: 10200, unit: 'kg', taxRate: 5, isTaxInclusive: true, stockQuantity: 35, lowStockThreshold: 8, isFavourite: false },
  { categoryName: 'Grocery & Staples', name: 'Toor Dal (1kg)', sku: 'GRO-003', sellingPricePaise: 15500, purchasePricePaise: 13200, unit: 'kg', taxRate: 0, isTaxInclusive: true, stockQuantity: 30, lowStockThreshold: 8, isFavourite: true },
  { categoryName: 'Grocery & Staples', name: 'Moong Dal (1kg)', sku: 'GRO-004', sellingPricePaise: 13000, purchasePricePaise: 11000, unit: 'kg', taxRate: 0, isTaxInclusive: true, stockQuantity: 25, lowStockThreshold: 6, isFavourite: false },
  { categoryName: 'Grocery & Staples', name: 'Urad Dal (1kg)', sku: 'GRO-005', sellingPricePaise: 14500, purchasePricePaise: 12200, unit: 'kg', taxRate: 0, isTaxInclusive: true, stockQuantity: 25, lowStockThreshold: 6, isFavourite: false },
  { categoryName: 'Grocery & Staples', name: 'Chana Dal (1kg)', sku: 'GRO-006', sellingPricePaise: 9500, purchasePricePaise: 7800, unit: 'kg', taxRate: 0, isTaxInclusive: true, stockQuantity: 30, lowStockThreshold: 8, isFavourite: false },
  { categoryName: 'Grocery & Staples', name: 'Whole Wheat Atta (5kg)', sku: 'GRO-007', sellingPricePaise: 24500, purchasePricePaise: 20500, unit: 'packet', taxRate: 5, isTaxInclusive: true, stockQuantity: 22, lowStockThreshold: 5, isFavourite: false },
  { categoryName: 'Grocery & Staples', name: 'Refined Sunflower Oil (1L)', sku: 'GRO-008', sellingPricePaise: 13500, purchasePricePaise: 11800, unit: 'liter', taxRate: 5, isTaxInclusive: true, stockQuantity: 40, lowStockThreshold: 10, isFavourite: true },
  { categoryName: 'Grocery & Staples', name: 'Groundnut Oil (1L)', sku: 'GRO-009', sellingPricePaise: 19500, purchasePricePaise: 17000, unit: 'liter', taxRate: 5, isTaxInclusive: true, stockQuantity: 20, lowStockThreshold: 5, isFavourite: false },
  { categoryName: 'Grocery & Staples', name: 'Iodized Salt (1kg)', sku: 'GRO-010', sellingPricePaise: 2800, purchasePricePaise: 2100, unit: 'packet', taxRate: 0, isTaxInclusive: true, stockQuantity: 60, lowStockThreshold: 12, isFavourite: false },
  { categoryName: 'Grocery & Staples', name: 'White Sugar (1kg)', sku: 'GRO-011', sellingPricePaise: 4800, purchasePricePaise: 4100, unit: 'kg', taxRate: 5, isTaxInclusive: true, stockQuantity: 45, lowStockThreshold: 10, isFavourite: true },
  { categoryName: 'Grocery & Staples', name: 'Instant Noodles Pack', sku: 'GRO-012', sellingPricePaise: 1400, purchasePricePaise: 1150, unit: 'packet', taxRate: 18, isTaxInclusive: true, stockQuantity: 80, lowStockThreshold: 15, isFavourite: true },

  // 3. Snacks & Biscuits (10)
  { categoryName: 'Snacks & Biscuits', name: 'Marie Gold Biscuits', sku: 'SNK-001', sellingPricePaise: 1000, purchasePricePaise: 800, unit: 'packet', taxRate: 18, isTaxInclusive: true, stockQuantity: 80, lowStockThreshold: 15, isFavourite: true },
  { categoryName: 'Snacks & Biscuits', name: 'Butter Cookies Pack', sku: 'SNK-002', sellingPricePaise: 2000, purchasePricePaise: 1600, unit: 'packet', taxRate: 18, isTaxInclusive: true, stockQuantity: 60, lowStockThreshold: 12, isFavourite: false },
  { categoryName: 'Snacks & Biscuits', name: 'Glucose Biscuits', sku: 'SNK-003', sellingPricePaise: 1000, purchasePricePaise: 800, unit: 'packet', taxRate: 18, isTaxInclusive: true, stockQuantity: 90, lowStockThreshold: 20, isFavourite: true },
  { categoryName: 'Snacks & Biscuits', name: 'Cream Wafer Biscuits', sku: 'SNK-004', sellingPricePaise: 2000, purchasePricePaise: 1500, unit: 'packet', taxRate: 18, isTaxInclusive: true, stockQuantity: 50, lowStockThreshold: 10, isFavourite: false },
  { categoryName: 'Snacks & Biscuits', name: 'Salted Potato Chips', sku: 'SNK-005', sellingPricePaise: 2000, purchasePricePaise: 1500, unit: 'packet', taxRate: 12, isTaxInclusive: true, stockQuantity: 70, lowStockThreshold: 15, isFavourite: false },
  { categoryName: 'Snacks & Biscuits', name: 'Masala Corn Puffs', sku: 'SNK-006', sellingPricePaise: 1000, purchasePricePaise: 750, unit: 'packet', taxRate: 12, isTaxInclusive: true, stockQuantity: 65, lowStockThreshold: 12, isFavourite: false },
  { categoryName: 'Snacks & Biscuits', name: 'Madras Mixture (250g)', sku: 'SNK-007', sellingPricePaise: 6500, purchasePricePaise: 4800, unit: 'packet', taxRate: 12, isTaxInclusive: true, stockQuantity: 32, lowStockThreshold: 8, isFavourite: false },
  { categoryName: 'Snacks & Biscuits', name: 'Roasted Peanuts (100g)', sku: 'SNK-008', sellingPricePaise: 3000, purchasePricePaise: 2200, unit: 'packet', taxRate: 12, isTaxInclusive: true, stockQuantity: 40, lowStockThreshold: 8, isFavourite: false },
  { categoryName: 'Snacks & Biscuits', name: 'Milk Chocolate Bar', sku: 'SNK-009', sellingPricePaise: 2000, purchasePricePaise: 1600, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 60, lowStockThreshold: 12, isFavourite: false },
  { categoryName: 'Snacks & Biscuits', name: 'Fruit Jam Jar (200g)', sku: 'SNK-010', sellingPricePaise: 7500, purchasePricePaise: 6000, unit: 'item', taxRate: 12, isTaxInclusive: true, stockQuantity: 20, lowStockThreshold: 5, isFavourite: false },

  // 4. Personal Care (10)
  { categoryName: 'Personal Care', name: 'Herbal Bath Soap (100g)', sku: 'PER-001', sellingPricePaise: 3800, purchasePricePaise: 3000, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 48, lowStockThreshold: 10, isFavourite: true },
  { categoryName: 'Personal Care', name: 'Moisturizing Soap Pack (3x100g)', sku: 'PER-002', sellingPricePaise: 11000, purchasePricePaise: 9000, unit: 'packet', taxRate: 18, isTaxInclusive: true, stockQuantity: 24, lowStockThreshold: 6, isFavourite: false },
  { categoryName: 'Personal Care', name: 'Mint Toothpaste (100g)', sku: 'PER-003', sellingPricePaise: 6200, purchasePricePaise: 5000, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 32, lowStockThreshold: 8, isFavourite: false },
  { categoryName: 'Personal Care', name: 'Soft Toothbrush', sku: 'PER-004', sellingPricePaise: 3000, purchasePricePaise: 2000, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 40, lowStockThreshold: 10, isFavourite: false },
  { categoryName: 'Personal Care', name: 'Anti-Dandruff Shampoo (180ml)', sku: 'PER-005', sellingPricePaise: 14500, purchasePricePaise: 11800, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 20, lowStockThreshold: 5, isFavourite: false },
  { categoryName: 'Personal Care', name: 'Coconut Hair Oil (100ml)', sku: 'PER-006', sellingPricePaise: 5500, purchasePricePaise: 4400, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 30, lowStockThreshold: 8, isFavourite: false },
  { categoryName: 'Personal Care', name: 'Talcum Powder (100g)', sku: 'PER-007', sellingPricePaise: 8500, purchasePricePaise: 6800, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 22, lowStockThreshold: 5, isFavourite: false },
  { categoryName: 'Personal Care', name: 'Hand Wash Refill (200ml)', sku: 'PER-008', sellingPricePaise: 7500, purchasePricePaise: 5800, unit: 'packet', taxRate: 18, isTaxInclusive: true, stockQuantity: 25, lowStockThreshold: 6, isFavourite: false },
  { categoryName: 'Personal Care', name: 'Shaving Razor Pack', sku: 'PER-009', sellingPricePaise: 4500, purchasePricePaise: 3400, unit: 'packet', taxRate: 18, isTaxInclusive: true, stockQuantity: 28, lowStockThreshold: 6, isFavourite: false },
  { categoryName: 'Personal Care', name: 'Cotton Buds Box', sku: 'PER-010', sellingPricePaise: 3500, purchasePricePaise: 2400, unit: 'box', taxRate: 12, isTaxInclusive: true, stockQuantity: 30, lowStockThreshold: 8, isFavourite: false },

  // 5. Home Care & Cleaning (8)
  { categoryName: 'Home Care & Cleaning', name: 'Detergent Powder (1kg)', sku: 'HOM-001', sellingPricePaise: 9800, purchasePricePaise: 8000, unit: 'packet', taxRate: 18, isTaxInclusive: true, stockQuantity: 28, lowStockThreshold: 6, isFavourite: true },
  { categoryName: 'Home Care & Cleaning', name: 'Liquid Detergent (500ml)', sku: 'HOM-002', sellingPricePaise: 12500, purchasePricePaise: 10200, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 20, lowStockThreshold: 5, isFavourite: false },
  { categoryName: 'Home Care & Cleaning', name: 'Lemon Dishwash Bar', sku: 'HOM-003', sellingPricePaise: 2000, purchasePricePaise: 1500, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 50, lowStockThreshold: 12, isFavourite: false },
  { categoryName: 'Home Care & Cleaning', name: 'Dishwash Gel (250ml)', sku: 'HOM-004', sellingPricePaise: 6500, purchasePricePaise: 5200, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 24, lowStockThreshold: 6, isFavourite: false },
  { categoryName: 'Home Care & Cleaning', name: 'Floor Cleaner Pine (500ml)', sku: 'HOM-005', sellingPricePaise: 9500, purchasePricePaise: 7600, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 22, lowStockThreshold: 5, isFavourite: false },
  { categoryName: 'Home Care & Cleaning', name: 'Toilet Cleaner (500ml)', sku: 'HOM-006', sellingPricePaise: 9900, purchasePricePaise: 8000, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 24, lowStockThreshold: 6, isFavourite: false },
  { categoryName: 'Home Care & Cleaning', name: 'Stainless Steel Scrubber', sku: 'HOM-007', sellingPricePaise: 2000, purchasePricePaise: 1300, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 45, lowStockThreshold: 10, isFavourite: false },
  { categoryName: 'Home Care & Cleaning', name: 'Sandal Agarbatti Pack', sku: 'HOM-008', sellingPricePaise: 2500, purchasePricePaise: 1700, unit: 'box', taxRate: 5, isTaxInclusive: true, stockQuantity: 40, lowStockThreshold: 10, isFavourite: false },

  // 6. Stationery & General (8)
  { categoryName: 'Stationery & General', name: 'A4 Ruled Notebook (172 Pages)', sku: 'STN-001', sellingPricePaise: 6000, purchasePricePaise: 4500, unit: 'item', taxRate: 12, isTaxInclusive: true, stockQuantity: 36, lowStockThreshold: 8, isFavourite: false },
  { categoryName: 'Stationery & General', name: 'Ballpoint Pen (Blue)', sku: 'STN-002', sellingPricePaise: 1000, purchasePricePaise: 700, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 100, lowStockThreshold: 20, isFavourite: false },
  { categoryName: 'Stationery & General', name: 'Permanent Marker', sku: 'STN-003', sellingPricePaise: 2500, purchasePricePaise: 1800, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 30, lowStockThreshold: 8, isFavourite: false },
  { categoryName: 'Stationery & General', name: 'Adhesive Glue Stick', sku: 'STN-004', sellingPricePaise: 3000, purchasePricePaise: 2100, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 25, lowStockThreshold: 6, isFavourite: false },
  { categoryName: 'Stationery & General', name: 'Cello Tape Roll', sku: 'STN-005', sellingPricePaise: 2500, purchasePricePaise: 1700, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 35, lowStockThreshold: 8, isFavourite: false },
  { categoryName: 'Stationery & General', name: 'AA Alkaline Battery (Pack of 2)', sku: 'STN-006', sellingPricePaise: 4000, purchasePricePaise: 3000, unit: 'packet', taxRate: 18, isTaxInclusive: true, stockQuantity: 40, lowStockThreshold: 10, isFavourite: false },
  { categoryName: 'Stationery & General', name: '9W LED Bulb', sku: 'STN-007', sellingPricePaise: 9500, purchasePricePaise: 7200, unit: 'item', taxRate: 18, isTaxInclusive: true, stockQuantity: 24, lowStockThreshold: 6, isFavourite: false },
  { categoryName: 'Stationery & General', name: 'Safety Matchbox (Pack of 10)', sku: 'STN-008', sellingPricePaise: 2000, purchasePricePaise: 1400, unit: 'packet', taxRate: 12, isTaxInclusive: true, stockQuantity: 50, lowStockThreshold: 10, isFavourite: false },
];
