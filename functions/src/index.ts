
/**
 * @fileoverview Main entry point for Firebase Functions.
 * This file should only import and export functions from other modules.
 */


// import { app, db } from "./config/firebase";

// export { app, db };


// Exporting specific functions for better organization
export * as team from './team/invite';
// export * from "./invoicing/receivables";
// export * as deleteInvoice from "./invoicing/deleteInvoice"; // Deprecated
export * as general from './general/contact';
export { clients } from './controllers/clientController';
export { products } from './controllers/productController';
export { invoices } from './controllers/invoiceController';
export { quotes } from './controllers/quoteController';
export { ncf } from './controllers/ncfController';
export { taxes } from './controllers/taxController';
export * as auth from './controllers/authController';
export { scanInvoice } from './controllers/aiController';
