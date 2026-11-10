// QuickBill Data Types & Domain Interfaces

export type SupportedLanguage = 'en' | 'ta';

export type BusinessType = 
  | 'restaurant' 
  | 'grocery' 
  | 'bakery' 
  | 'tea_shop' 
  | 'clothing' 
  | 'supermarket' 
  | 'retail' 
  | 'other';

export type UserRole = 'owner' | 'admin' | 'staff';

export interface Profile {
  id: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  preferredLanguage: SupportedLanguage;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  businessType: BusinessType;
  ownerName: string;
  phone: string;
  email?: string;
  address: string;
  logoUrl?: string;
  isGstRegistered: boolean;
  gstin?: string;
  currency: string;
  taxInclusive: boolean;
  defaultTaxRate: number; // e.g. 5, 12, 18
  invoicePrefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  role: UserRole;
  status: 'active' | 'invited' | 'suspended';
  profile?: Profile;
  createdAt: string;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  nameTamil?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
}

export type ProductUnit = 
  | 'item' 
  | 'kg' 
  | 'g' 
  | 'liter' 
  | 'ml' 
  | 'meter' 
  | 'packet' 
  | 'box' 
  | 'plate' 
  | 'cup';

export interface Product {
  id: string;
  businessId: string;
  categoryId?: string;
  name: string;
  nameTamil?: string;
  sku?: string;
  barcode?: string;
  sellingPricePaise: number; // In paise (₹1.00 = 100 paise)
  purchasePricePaise?: number;
  unit: ProductUnit;
  taxRate: number; // e.g., 0, 5, 12, 18, 28
  isTaxInclusive: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  imageUrl?: string;
  isFavourite: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  outstandingBalancePaise: number; // positive = customer owes shop (udhar)
  createdAt: string;
  updatedAt: string;
}

export type DiscountType = 'none' | 'fixed' | 'percentage';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'void';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit' | 'split';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface CartItem {
  id: string; // product id or custom id
  productId?: string;
  name: string;
  nameTamil?: string;
  unit: ProductUnit;
  quantity: number;
  unitPricePaise: number;
  taxRate: number;
  isTaxInclusive: boolean;
  notes?: string;
}

export interface CalculatedItem {
  cartItem: CartItem;
  quantity: number;
  unitPricePaise: number;
  subtotalPaise: number;
  discountPaise: number;
  taxableAmountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  totalPaise: number;
}

export interface BillCalculationResult {
  items: CalculatedItem[];
  subtotalPaise: number;
  discountType: DiscountType;
  discountValue: number;
  discountPaise: number;
  taxableSubtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
}

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  productId?: string;
  productName: string;
  productNameTamil?: string;
  unit: ProductUnit;
  quantity: number;
  unitPricePaise: number;
  subtotalPaise: number;
  taxRate: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  taxPaise: number;
  discountPaise: number;
  totalPaise: number;
}

export interface PaymentRecord {
  id?: string;
  businessId: string;
  invoiceId?: string;
  customerId?: string;
  amountPaise: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  localId?: string;
  notes?: string;
  createdAt?: string;
}

export interface Invoice {
  id: string;
  businessId: string;
  customerId?: string;
  createdBy?: string;
  invoiceNumber: string;
  financialYear: string;
  localId?: string;
  customerName?: string;
  customerPhone?: string;
  subtotalPaise: number;
  discountType: DiscountType;
  discountValue: number;
  discountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  grandTotalPaise: number;
  paidAmountPaise: number;
  balanceAmountPaise: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  isVoid: boolean;
  voidReason?: string;
  voidedAt?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  items?: InvoiceItem[];
  payments?: PaymentRecord[];
}

export interface StockMovement {
  id: string;
  businessId: string;
  productId: string;
  movementType: 'sale' | 'purchase' | 'return' | 'adjustment' | 'initial';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  referenceId?: string;
  createdAt: string;
}

export type SubscriptionPlan = 'free' | 'pro';

export interface Subscription {
  id: string;
  businessId: string;
  plan: SubscriptionPlan;
  billingCycle?: 'monthly' | 'yearly';
  status: 'active' | 'expired' | 'trialing' | 'cancelled';
  startsAt: string;
  expiresAt?: string;
  autoRenew: boolean;
  maxStaff: number;
  cloudBackupEnabled: boolean;
  advancedReportsEnabled: boolean;
}

export interface SyncQueueItem {
  id: string;
  businessId: string;
  entityType: 'invoice' | 'product' | 'customer' | 'stock_movement';
  entityId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: string; // JSON encoded
  retryCount: number;
  status: 'pending' | 'processing' | 'failed';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

