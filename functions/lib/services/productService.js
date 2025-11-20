"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = void 0;
const productRepository_1 = require("../repositories/productRepository");
const categoryRepository_1 = require("../repositories/categoryRepository");
const functions = __importStar(require("firebase-functions"));
const index_1 = require("../index");
exports.productService = {
    async createProduct(data, userId) {
        // Check for duplicate code
        const existingProducts = await productRepository_1.productRepository.findByCode(data.code, userId);
        if (existingProducts.length > 0) {
            throw new functions.https.HttpsError("already-exists", "El código del producto ya existe.");
        }
        const id = index_1.db.collection("products").doc().id;
        const newProduct = Object.assign(Object.assign({}, data), { id,
            userId, createdAt: new Date(), isActive: true });
        await productRepository_1.productRepository.create(newProduct);
        return id;
    },
    async updateProduct(id, data, userId) {
        const product = await productRepository_1.productRepository.get(id);
        if (!product || product.userId !== userId) {
            throw new functions.https.HttpsError("not-found", "Producto no encontrado o no autorizado.");
        }
        // Check for duplicate code if code is being updated
        if (data.code && data.code !== product.code) {
            const existingProducts = await productRepository_1.productRepository.findByCode(data.code, userId);
            if (existingProducts.length > 0) {
                throw new functions.https.HttpsError("already-exists", "El código del producto ya existe.");
            }
        }
        await productRepository_1.productRepository.update(id, data);
    },
    async deleteProduct(id, userId) {
        const product = await productRepository_1.productRepository.get(id);
        if (!product || product.userId !== userId) {
            throw new functions.https.HttpsError("not-found", "Producto no encontrado o no autorizado.");
        }
        await productRepository_1.productRepository.delete(id);
    },
    async checkProductCodeExists(code, userId, excludeId) {
        const products = await productRepository_1.productRepository.findByCode(code, userId);
        if (excludeId) {
            return products.some(p => p.id !== excludeId);
        }
        return products.length > 0;
    },
    async batchCreateProducts(products, userId) {
        const batch = index_1.db.batch();
        const existingCategories = await categoryRepository_1.categoryRepository.getAll(userId);
        const existingCategoryNames = new Set(existingCategories.map(c => c.name.toUpperCase()));
        // We need to track new categories created in this batch to avoid duplicates
        const newCategoryNames = new Set();
        for (const productData of products) {
            // Handle Category
            if (productData.category) {
                const upperCat = productData.category.toUpperCase();
                if (!existingCategoryNames.has(upperCat) && !newCategoryNames.has(upperCat)) {
                    const catId = index_1.db.collection("categories").doc().id;
                    const newCategory = {
                        id: catId,
                        name: productData.category,
                        description: "Categoría creada automáticamente desde importación.",
                        userId,
                        createdAt: new Date(),
                        isActive: true
                    };
                    const catRef = index_1.db.collection("categories").doc(catId);
                    batch.set(catRef, newCategory);
                    newCategoryNames.add(upperCat);
                }
            }
            // Handle Product
            const prodId = index_1.db.collection("products").doc().id;
            const newProduct = Object.assign(Object.assign({}, productData), { id: prodId, userId, createdAt: new Date(), isActive: true });
            const prodRef = index_1.db.collection("products").doc(prodId);
            batch.set(prodRef, newProduct);
        }
        await batch.commit();
    }
};
//# sourceMappingURL=productService.js.map