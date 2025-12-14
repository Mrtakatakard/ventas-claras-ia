"use strict";
/**
 * @fileoverview Main entry point for Firebase Functions.
 * This file should only import and export functions from other modules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsapp = exports.scanInvoice = exports.auth = exports.taxes = exports.ncf = exports.quotes = exports.invoices = exports.products = exports.clients = exports.general = exports.team = void 0;
// import { app, db } from "./config/firebase";
// export { app, db };
// Exporting specific functions for better organization
exports.team = require("./team/invite");
// export * from "./invoicing/receivables";
// export * as deleteInvoice from "./invoicing/deleteInvoice"; // Deprecated
var generalController_1 = require("./controllers/generalController");
Object.defineProperty(exports, "general", { enumerable: true, get: function () { return generalController_1.general; } });
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
exports.auth = require("./controllers/authController");
var aiController_1 = require("./controllers/aiController");
Object.defineProperty(exports, "scanInvoice", { enumerable: true, get: function () { return aiController_1.scanInvoice; } });
exports.whatsapp = require("./controllers/whatsappController");
//# sourceMappingURL=index.js.map