

export interface Address {
  id: string;
  alias: string;
  fullAddress: string;
  isDefault: boolean;
}

export interface Reminder {
  id: string;
  note: string;
  dateTime: string; // Store as ISO string
  status: 'pending' | 'completed';
}

export interface ClientType {
  id: string;
  name: string;
  description: string;
  userId: string;
  createdAt: Date;
  enableRestockTracking?: boolean;
  isActive: boolean;
  organizationId?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  userId: string;
  createdAt: Date;
  isActive: boolean;
  organizationId?: string;
}

export interface Client {
  id: string;
  name: string;
  companyName?: string; // Razon Social
  phone: string;
  birthday: string;
  email: string;
  rnc?: string; // Tax ID
  addresses: Address[];
  clientTypeId: string;
  clientTypeName: string;
  reminders?: Reminder[];
  followUpChecks?: {
    gaveSample: boolean;
    askedForReferrals: boolean;
    addedValue: boolean;
    invitedToChallenge: boolean;
    addedToBroadcast: boolean;
    gavePlan: boolean;
  };
  userId: string;
  createdAt: Date;
  isActive: boolean;
  organizationId?: string;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  amount: number;
  currency: 'DOP' | 'USD';
  paymentDate: string;
  method: 'efectivo' | 'transferencia' | 'tarjeta';
  status: 'pagado';
  note?: string;
  imageUrl?: string;
}

export interface ProductBatch {
  id: string;
  cost: number;
  price: number;
  stock: number;
  expirationDate?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  currency: 'DOP' | 'USD';
  category: string;
  productType: 'good' | 'service'; // 'good' = inventory tracked, 'service' = non-inventory
  allowNegativeStock?: boolean; // If true, allows selling even if stock is 0 (for goods)
  taxType?: string; // Default tax code (e.g., '1' for 18%)
  batches: ProductBatch[];
  // Computed properties from first batch for backward compatibility
  price?: number;
  cost?: number;
  stock?: number;
  isTaxExempt?: boolean;
  notificationThreshold?: number;
  imageUrl?: string;
  restockTimeDays?: number | null;
  userId: string;
  createdAt: Date;
  isActive: boolean;
  organizationId?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  discount?: number;
  finalPrice?: number;
  numberOfPeople?: number;
  followUpStatus?: 'realizado' | 'pendiente';
  isTaxExempt?: boolean;
  taxType?: string; // '1'=18%, '2'=16%, '3'=0% (Exempt), etc.
  goodServiceIndicator?: '1' | '2'; // '1'=Bienes, '2'=Servicios
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  issueDate: string;
  dueDate: string; // Expiration date
  items: InvoiceItem[];
  subtotal: number;
  discountTotal?: number;
  itbis: number;
  total: number;
  status: 'borrador' | 'enviada' | 'aceptada' | 'facturada' | 'rechazada';
  currency: 'DOP' | 'USD';
  notes?: string;
  includeITBIS?: boolean;
  itbisRate?: number;
  userId: string;
  createdAt: Date;
  isActive: boolean;
  organizationId?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string; // Contact Name or Razon Social if no contact name
  clientCompanyName?: string; // Explicit Razon Social
  clientRnc?: string;
  clientEmail: string;
  clientAddress?: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number; // Gross subtotal
  discountTotal?: number;
  itbis: number;
  total: number;
  payments: Payment[];
  balanceDue: number;
  status: 'pagada' | 'pendiente' | 'vencida' | 'parcialmente pagada';
  currency: 'DOP' | 'USD';
  quoteId?: string;
  includeITBIS?: boolean;
  itbisRate?: number; // 0.18 or 0.16
  userId: string;
  createdAt: Date;
  isActive: boolean;
  organizationId?: string;
  ncf?: string;
  ncfType?: string;
}

export interface NCFSequence {
  id: string;
  name: string; // e.g., "Crédito Fiscal", "Consumidor Final"
  typeCode: string; // e.g., "B01", "B02", "E31"
  prefix: string; // e.g., "B010000"
  currentNumber: number;
  startNumber: number;
  endNumber: number;
  expirationDate?: string;
  userId: string;
  isActive: boolean;
  organizationId?: string;
  updatedAt: Date;
}

export interface TaxSettings {
  id: string;
  name: string; // e.g. "ITBIS 18%"
  rate: number; // e.g. 0.18
  isDefault?: boolean;
  userId: string;
  isActive: boolean;
  organizationId?: string;
}

export type OrganizationPlan = 'free' | 'entrepreneur' | 'pyme' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  plan: OrganizationPlan;
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trial';

  // 1. LIMITS (The Cap)
  // These are calculated dynamically: PlanBase + PurchasedExtras
  limits: {
    invoicesPerMonth: number;
    aiCreditsPerMonth: number;
    usersLimit: number;
    hasDigitalMenu: boolean;
    hasWhatsAppBot: boolean;
  };

  // 2. ADD-ONS (The "Bucket" of things you bought)
  addOns: {
    extraInvoices: number;   // Bought packs
    extraAICredits: number;  // Bought packs
  };

  // 3. USAGE (The Meter)
  usage: {
    periodStart: string; // ISO String: "2024-03-01". Resets when month changes.
    invoicesCreatedThisPeriod: number;
    aiCreditsUsedThisPeriod: number;
  };

  // 4. BILLING
  billingProvider?: 'lemonsqueezy' | 'manual' | 'stripe';
  billingCustomerId?: string;

  createdAt: Date;
  isActive: boolean;
}

export interface UserProfile {
  id: string; // UID from Auth
  email: string;
  name: string;
  role: 'superAdmin' | 'admin' | 'user'; // System role

  // Organization Context
  organizationId?: string; // Link to the Org
  organizationRole?: 'owner' | 'admin' | 'member'; // Role within the Org

  status: 'active' | 'pending';
  planId?: string; // Deprecated by Organization.plan, kept for legacy compatibility
  invitedBy?: string; // UID of the admin who invited this user
  createdAt: Date;
  isActive: boolean;
  rnc?: string;
  companyName?: string;
  phoneNumber?: string; // E.164 format
}

