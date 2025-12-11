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

export const productBatchSchema = z.object({
    id: z.string().optional(),
    cost: z.number().min(0),
    price: z.number().positive(),
    stock: z.number().int().min(0),
    expirationDate: z.string().optional(), // ISO date string
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
    itbisRate: z.number().optional(),
    ncfType: z.string().optional(),
});

export const createNCFSequenceSchema = z.object({
    name: z.string().min(1, "Name is required"),
    typeCode: z.string().min(2, "Type code (e.g. B01) is required"),
    prefix: z.string().min(1, "Prefix is required"),
    startNumber: z.number().int().min(1),
    endNumber: z.number().int().min(1),
    currentNumber: z.number().int().optional(), // Defaults to startNumber if not provided
    expirationDate: z.string().optional(),
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
    itbisRate: z.number().optional(),
});

export const updateQuoteSchema = createQuoteSchema.partial().extend({
    id: z.string(),
});

export const createProductSchema = z.object({
    code: z.string().min(1, "El código es requerido."),
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    description: z.string().optional(),
    currency: z.enum(['DOP', 'USD']),
    category: z.string().min(1, "La categoría es requerida."),
    batches: z.array(productBatchSchema).min(1, "Debes agregar al menos un lote de producto."),
    isTaxExempt: z.boolean().optional(),
    notificationThreshold: z.number().int().min(0).optional(),
    imageUrl: z.string().optional(),
    restockTimeDays: z.number().int().min(0).nullable().optional(),
    // Computed fields like price, cost, stock are derived from batches in some views, 
    // but might be passed for backward compatibility or simple indexing.
    // The service layer might calculate them, allowing them to be optional here effectively.
    // However, looking at the frontend form, it passes them. Let's make them optional in schema
    // as the service/repository might calculate them or they might be legacy.
    // Update: frontend sends keys 'price', 'cost', 'stock' calculated from batches[0]
    price: z.number().optional(),
    cost: z.number().optional(),
    stock: z.number().optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
    id: z.string().optional(), // ID is usually passed as separate argument to update function, but sometimes in body
});
