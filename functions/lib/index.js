"use strict";
/**
 * @fileoverview Main entry point for Firebase Functions.
 * This file should only import and export functions from other modules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteController = exports.invoiceController = exports.productController = exports.clientController = exports.general = exports.team = void 0;
// import { app, db } from "./config/firebase";
// export { app, db };
// Exporting specific functions for better organization
exports.team = require("./team/invite");
// export * as invoicing from "./invoicing/receivables"; // Deprecated
// export * as deleteInvoice from "./invoicing/deleteInvoice"; // Deprecated
exports.general = require("./general/contact");
exports.clientController = require("./controllers/clientController");
exports.productController = require("./controllers/productController");
exports.invoiceController = require("./controllers/invoiceController");
exports.quoteController = require("./controllers/quoteController");
//# sourceMappingURL=index.js.map