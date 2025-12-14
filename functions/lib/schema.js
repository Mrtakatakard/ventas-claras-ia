"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = exports.updateQuoteSchema = exports.createQuoteSchema = exports.addPaymentSchema = exports.updateInvoiceSchema = exports.createTaxSchema = exports.createNCFSequenceSchema = exports.createInvoiceSchema = exports.productBatchSchema = exports.paymentSchema = exports.invoiceItemSchema = exports.addressSchema = void 0;
const zod_1 = require("zod");
// Helper schemas
exports.addressSchema = zod_1.z.object({
    id: zod_1.z.string(),
    alias: zod_1.z.string(),
    fullAddress: zod_1.z.string(),
    isDefault: zod_1.z.boolean(),
});
exports.invoiceItemSchema = zod_1.z.object({
    productId: zod_1.z.string(),
    productName: zod_1.z.string(),
    quantity: zod_1.z.number().min(0),
    unitPrice: zod_1.z.number().min(0),
    unitCost: zod_1.z.number().optional(),
    discount: zod_1.z.number().optional(),
    finalPrice: zod_1.z.number().optional(),
    numberOfPeople: zod_1.z.number().optional(),
    followUpStatus: zod_1.z.enum(['realizado', 'pendiente']).optional(),
    isTaxExempt: zod_1.z.boolean().optional(),
    taxType: zod_1.z.string().optional(),
    goodServiceIndicator: zod_1.z.enum(['1', '2']).optional(),
});
exports.paymentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    receiptNumber: zod_1.z.string(),
    amount: zod_1.z.number().positive(),
    currency: zod_1.z.enum(['DOP', 'USD']),
    paymentDate: zod_1.z.string(),
    method: zod_1.z.enum(['efectivo', 'transferencia', 'tarjeta']),
    status: zod_1.z.literal('pagado'),
    note: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().optional(),
});
exports.productBatchSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    cost: zod_1.z.number().min(0),
    price: zod_1.z.number().positive(),
    stock: zod_1.z.number().int().min(0),
    expirationDate: zod_1.z.string().optional(), // ISO date string
});
// Main schemas for creation/updates
// We use .partial() or .omit() depending on the use case (create vs update)
exports.createInvoiceSchema = zod_1.z.object({
    clientId: zod_1.z.string().min(1, 'Client ID is required'),
    clientName: zod_1.z.string().min(1, 'Client Name is required'),
    clientRnc: zod_1.z.string().nullish().or(zod_1.z.literal('')),
    clientEmail: zod_1.z.string().email().nullish().or(zod_1.z.literal('')),
    clientAddress: zod_1.z.string().nullish().or(zod_1.z.literal('')),
    issueDate: zod_1.z.string(),
    dueDate: zod_1.z.string(),
    items: zod_1.z.array(exports.invoiceItemSchema).min(1, 'At least one item is required'),
    subtotal: zod_1.z.number().min(0),
    discountTotal: zod_1.z.number().optional(),
    itbis: zod_1.z.number().min(0),
    total: zod_1.z.number().min(0),
    currency: zod_1.z.enum(['DOP', 'USD']),
    quoteId: zod_1.z.string().optional(),
    includeITBIS: zod_1.z.boolean().optional(),
    itbisRate: zod_1.z.number().optional(),
    ncfType: zod_1.z.string().optional(),
});
exports.createNCFSequenceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    typeCode: zod_1.z.string().min(2, "Type code (e.g. B01) is required"),
    prefix: zod_1.z.string().min(1, "Prefix is required"),
    startNumber: zod_1.z.number().int().min(1),
    endNumber: zod_1.z.number().int().min(1),
    currentNumber: zod_1.z.number().int().optional(), // Defaults to startNumber if not provided
    expirationDate: zod_1.z.string().optional(),
});
exports.createTaxSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    rate: zod_1.z.number().min(0, "Rate must be positive"),
    isDefault: zod_1.z.boolean().optional(),
});
exports.updateInvoiceSchema = exports.createInvoiceSchema.partial().extend({
    id: zod_1.z.string(),
});
exports.addPaymentSchema = zod_1.z.object({
    invoiceId: zod_1.z.string().min(1, 'Invoice ID is required'),
    amount: zod_1.z.number().positive('Amount must be positive'),
    date: zod_1.z.string(),
    method: zod_1.z.enum(['efectivo', 'transferencia', 'tarjeta']),
    note: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().optional(),
});
exports.createQuoteSchema = zod_1.z.object({
    clientId: zod_1.z.string().min(1),
    clientName: zod_1.z.string().min(1),
    clientEmail: zod_1.z.string().email(),
    clientAddress: zod_1.z.string().optional(),
    issueDate: zod_1.z.string(),
    dueDate: zod_1.z.string(),
    items: zod_1.z.array(exports.invoiceItemSchema).min(1),
    subtotal: zod_1.z.number().min(0),
    discountTotal: zod_1.z.number().optional(),
    itbis: zod_1.z.number().min(0),
    total: zod_1.z.number().min(0),
    currency: zod_1.z.enum(['DOP', 'USD']),
    notes: zod_1.z.string().optional(),
    includeITBIS: zod_1.z.boolean().optional(),
    itbisRate: zod_1.z.number().optional(),
});
exports.updateQuoteSchema = exports.createQuoteSchema.partial().extend({
    id: zod_1.z.string(),
});
exports.createProductSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, "El código es requerido."),
    name: zod_1.z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    description: zod_1.z.string().optional(),
    currency: zod_1.z.enum(['DOP', 'USD']),
    category: zod_1.z.string().min(1, "La categoría es requerida."),
    batches: zod_1.z.array(exports.productBatchSchema).min(1, "Debes agregar al menos un lote de producto."),
    isTaxExempt: zod_1.z.boolean().optional(),
    notificationThreshold: zod_1.z.number().int().min(0).optional(),
    imageUrl: zod_1.z.string().optional(),
    restockTimeDays: zod_1.z.number().int().min(0).nullable().optional(),
    // Computed fields like price, cost, stock are derived from batches in some views, 
    // but might be passed for backward compatibility or simple indexing.
    // The service layer might calculate them, allowing them to be optional here effectively.
    // However, looking at the frontend form, it passes them. Let's make them optional in schema
    // as the service/repository might calculate them or they might be legacy.
    // Update: frontend sends keys 'price', 'cost', 'stock' calculated from batches[0]
    price: zod_1.z.number().optional(),
    cost: zod_1.z.number().optional(),
    stock: zod_1.z.number().optional(),
});
exports.updateProductSchema = exports.createProductSchema.partial().extend({
    id: zod_1.z.string().optional(), // ID is usually passed as separate argument to update function, but sometimes in body
});
//# sourceMappingURL=schema.js.map