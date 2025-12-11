
/**
 * @fileoverview Main entry point for Firebase Functions.
 * This file should only import and export functions from other modules.
 */


// import { app, db } from "./config/firebase";

// export { app, db };


// Exporting specific functions for better organization
export * as team from './team/invite';
export * from "./invoicing/receivables";
// export * as deleteInvoice from "./invoicing/deleteInvoice"; // Deprecated
export * as general from './general/contact';
export * from './controllers/clientController';
export * from './controllers/productController';
export * from './controllers/invoiceController';
export * from './controllers/quoteController';
export * from './controllers/ncfController';
