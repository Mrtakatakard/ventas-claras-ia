"use strict";
/**
 * @fileoverview Main entry point for Firebase Functions.
 * This file should only import and export functions from other modules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.taxes = exports.ncf = exports.quotes = exports.invoices = exports.products = exports.clients = void 0;
// import { app, db } from "./config/firebase";
// export { app, db };
// Exporting specific functions for better organization
// export * as team from './team/invite';
// export * from "./invoicing/receivables";
// export * as deleteInvoice from "./invoicing/deleteInvoice"; // Deprecated
// export * as general from './general/contact';
var clientController_1 = require("./controllers/clientController");
Object.defineProperty(exports, "clients", { enumerable: true, get: function () { return clientController_1.clients; } });
var productController_1 = require("./controllers/productController");
Object.defineProperty(exports, "products", { enumerable: true, get: function () { return productController_1.products; } });
var invoiceController_1 = require("./controllers/invoiceController");
Object.defineProperty(exports, "invoices", { enumerable: true, get: function () { return invoiceController_1.invoices; } });
var quoteController_1 = require("./controllers/quoteController");
Object.defineProperty(exports, "quotes", { enumerable: true, get: function () { return quoteController_1.quotes; } });
var ncfController_1 = require("./controllers/ncfController");
Object.defineProperty(exports, "ncf", { enumerable: true, get: function () { return ncfController_1.ncf; } });
var taxController_1 = require("./controllers/taxController");
Object.defineProperty(exports, "taxes", { enumerable: true, get: function () { return taxController_1.taxes; } });
//# sourceMappingURL=index.js.map