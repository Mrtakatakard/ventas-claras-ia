

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
}

export interface Category {
  id: string;
  name: string;
  description: string;
  userId: string;
  createdAt: Date;
  isActive: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  birthday: string;
  email: string;
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
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
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
  updatedAt: Date;
}

export interface TaxSettings {
  id: string;
  name: string; // e.g. "ITBIS 18%"
  rate: number; // e.g. 0.18
  isDefault?: boolean;
  userId: string;
  isActive: boolean;
}

export interface UserProfile {
  id: string; // UID from Auth
  email: string;
  name: string;
  role: 'superAdmin' | 'admin' | 'user';
  status: 'active' | 'pending';
  planId?: 'pro' | 'basic' | 'legacy'; // 'legacy' for old users, undefined for new ones until they pick
  invitedBy?: string; // UID of the admin who invited this user
  createdAt: Date;
  isActive: boolean;
}

