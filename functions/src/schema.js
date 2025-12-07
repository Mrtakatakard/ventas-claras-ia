"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateQuoteSchema = exports.createQuoteSchema = exports.addPaymentSchema = exports.updateInvoiceSchema = exports.createInvoiceSchema = exports.paymentSchema = exports.invoiceItemSchema = exports.addressSchema = void 0;
var zod_1 = require("zod");
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
// Main schemas for creation/updates
// We use .partial() or .omit() depending on the use case (create vs update)
exports.createInvoiceSchema = zod_1.z.object({
    clientId: zod_1.z.string().min(1, "Client ID is required"),
    clientName: zod_1.z.string().min(1, "Client Name is required"),
    clientEmail: zod_1.z.string().email("Invalid client email"),
    clientAddress: zod_1.z.string().optional(),
    issueDate: zod_1.z.string(),
    dueDate: zod_1.z.string(),
    items: zod_1.z.array(exports.invoiceItemSchema).min(1, "At least one item is required"),
    subtotal: zod_1.z.number().min(0),
    discountTotal: zod_1.z.number().optional(),
    itbis: zod_1.z.number().min(0),
    total: zod_1.z.number().min(0),
    currency: zod_1.z.enum(['DOP', 'USD']),
    quoteId: zod_1.z.string().optional(),
    includeITBIS: zod_1.z.boolean().optional(),
});
exports.updateInvoiceSchema = exports.createInvoiceSchema.partial().extend({
    id: zod_1.z.string(),
});
exports.addPaymentSchema = zod_1.z.object({
    invoiceId: zod_1.z.string().min(1, "Invoice ID is required"),
    amount: zod_1.z.number().positive("Amount must be positive"),
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
});
exports.updateQuoteSchema = exports.createQuoteSchema.partial().extend({
    id: zod_1.z.string(),
});
