import { productRepository } from "../repositories/productRepository";
import { categoryRepository } from "../repositories/categoryRepository";
import * as functions from "firebase-functions";
import { db } from "../index";
export const productService = {
    async createProduct(data, userId) {
        // Check for duplicate code
        const existingProducts = await productRepository.findByCode(data.code, userId);
        if (existingProducts.length > 0) {
            throw new functions.https.HttpsError("already-exists", "El código del producto ya existe.");
        }
        const id = db.collection("products").doc().id;
        const newProduct = Object.assign(Object.assign({}, data), { id,
            userId, createdAt: new Date(), isActive: true });
        await productRepository.create(newProduct);
        return id;
    },
    async updateProduct(id, data, userId) {
        const product = await productRepository.get(id);
        if (!product || product.userId !== userId) {
            throw new functions.https.HttpsError("not-found", "Producto no encontrado o no autorizado.");
        }
        // Check for duplicate code if code is being updated
        if (data.code && data.code !== product.code) {
            const existingProducts = await productRepository.findByCode(data.code, userId);
            if (existingProducts.length > 0) {
                throw new functions.https.HttpsError("already-exists", "El código del producto ya existe.");
            }
        }
        await productRepository.update(id, data);
    },
    async deleteProduct(id, userId) {
        const product = await productRepository.get(id);
        if (!product || product.userId !== userId) {
            throw new functions.https.HttpsError("not-found", "Producto no encontrado o no autorizado.");
        }
        await productRepository.delete(id);
    },
    async checkProductCodeExists(code, userId, excludeId) {
        const products = await productRepository.findByCode(code, userId);
        if (excludeId) {
            return products.some(p => p.id !== excludeId);
        }
        return products.length > 0;
    },
    async batchCreateProducts(products, userId) {
        const batch = db.batch();
        const existingCategories = await categoryRepository.getAll(userId);
        const existingCategoryNames = new Set(existingCategories.map(c => c.name.toUpperCase()));
        // We need to track new categories created in this batch to avoid duplicates
        const newCategoryNames = new Set();
        for (const productData of products) {
            // Handle Category
            if (productData.category) {
                const upperCat = productData.category.toUpperCase();
                if (!existingCategoryNames.has(upperCat) && !newCategoryNames.has(upperCat)) {
                    const catId = db.collection("categories").doc().id;
                    const newCategory = {
                        id: catId,
                        name: productData.category,
                        description: "Categoría creada automáticamente desde importación.",
                        userId,
                        createdAt: new Date(),
                        isActive: true
                    };
                    const catRef = db.collection("categories").doc(catId);
                    batch.set(catRef, newCategory);
                    newCategoryNames.add(upperCat);
                }
            }
            // Handle Product
            const prodId = db.collection("products").doc().id;
            const newProduct = Object.assign(Object.assign({}, productData), { id: prodId, userId, createdAt: new Date(), isActive: true });
            const prodRef = db.collection("products").doc(prodId);
            batch.set(prodRef, newProduct);
        }
        await batch.commit();
    }
};
//# sourceMappingURL=productService.js.map