
/**
 * @fileoverview Main entry point for Firebase Functions.
 * This file should only import and export functions from other modules.
 */


// import { app, db } from "./config/firebase";

// export { app, db };


// Exporting specific functions for better organization
export * as team from "./team/invite";
// export * as invoicing from "./invoicing/receivables"; // Deprecated
// export * as deleteInvoice from "./invoicing/deleteInvoice"; // Deprecated
export * as general from "./general/contact";
export * as clientController from "./controllers/clientController";
export * as productController from "./controllers/productController";
export * as invoiceController from "./controllers/invoiceController";
export * as quoteController from "./controllers/quoteController";
