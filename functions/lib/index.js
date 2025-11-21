/**
 * @fileoverview Main entry point for Firebase Functions.
 * This file should only import and export functions from other modules.
 */
import * as admin from "firebase-admin";
// Initialize Firebase Admin SDK
export const app = admin.initializeApp();
export const db = admin.firestore();
import * as team_1 from "./team/invite";
export { team_1 as team };
import * as general_1 from "./general/contact";
export { general_1 as general };
import * as clientController_1 from "./controllers/clientController";
export { clientController_1 as clientController };
import * as productController_1 from "./controllers/productController";
export { productController_1 as productController };
import * as invoiceController_1 from "./controllers/invoiceController";
export { invoiceController_1 as invoiceController };
import * as quoteController_1 from "./controllers/quoteController";
export { quoteController_1 as quoteController };
//# sourceMappingURL=index.js.map