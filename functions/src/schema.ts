import { z } from 'zod';

// Helper schemas
export const addressSchema = z.object({
    id: z.string(),
    alias: z.string(),
    fullAddress: z.string(),
    isDefault: z.boolean(),
});

export const invoiceItemSchema = z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().min(0),
    unitPrice: z.number().min(0),
    unitCost: z.number().optional(),
    discount: z.number().optional(),
    finalPrice: z.number().optional(),
    numberOfPeople: z.number().optional(),
    followUpStatus: z.enum(['realizado', 'pendiente']).optional(),
    isTaxExempt: z.boolean().optional(),
});

export const paymentSchema = z.object({
    id: z.string(),
    receiptNumber: z.string(),
    amount: z.number().positive(),
    currency: z.enum(['DOP', 'USD']),
    paymentDate: z.string(),
    method: z.enum(['efectivo', 'transferencia', 'tarjeta']),
    status: z.literal('pagado'),
    note: z.string().optional(),
    imageUrl: z.string().optional(),
});

// Main schemas for creation/updates
// We use .partial() or .omit() depending on the use case (create vs update)

export const createInvoiceSchema = z.object({
    clientId: z.string().min(1, 'Client ID is required'),
    clientName: z.string().min(1, 'Client Name is required'),
    clientEmail: z.string().email('Invalid client email'),
    clientAddress: z.string().optional(),
    issueDate: z.string(),
    dueDate: z.string(),
    items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
    subtotal: z.number().min(0),
    discountTotal: z.number().optional(),
    itbis: z.number().min(0),
    total: z.number().min(0),
    currency: z.enum(['DOP', 'USD']),
    quoteId: z.string().optional(),
    includeITBIS: z.boolean().optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
    id: z.string(),
});

export const addPaymentSchema = z.object({
    invoiceId: z.string().min(1, 'Invoice ID is required'),
    amount: z.number().positive('Amount must be positive'),
    date: z.string(),
    method: z.enum(['efectivo', 'transferencia', 'tarjeta']),
    note: z.string().optional(),
    imageUrl: z.string().optional(),
});

export const createQuoteSchema = z.object({
    clientId: z.string().min(1),
    clientName: z.string().min(1),
    clientEmail: z.string().email(),
    clientAddress: z.string().optional(),
    issueDate: z.string(),
    dueDate: z.string(),
    items: z.array(invoiceItemSchema).min(1),
    subtotal: z.number().min(0),
    discountTotal: z.number().optional(),
    itbis: z.number().min(0),
    total: z.number().min(0),
    currency: z.enum(['DOP', 'USD']),
    notes: z.string().optional(),
    includeITBIS: z.boolean().optional(),
});

export const updateQuoteSchema = createQuoteSchema.partial().extend({
    id: z.string(),
});
