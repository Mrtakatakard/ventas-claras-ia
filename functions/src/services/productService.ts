import { productRepository } from "../repositories/productRepository";
import { categoryRepository } from "../repositories/categoryRepository";
import { Product, Category } from "../types";
import * as functions from "firebase-functions";
import { db } from "../config/firebase";

export const productService = {
    async createProduct(data: Omit<Product, "id" | "createdAt" | "isActive">, userId: string): Promise<string> {
        // Check for duplicate code
        const existingProducts = await productRepository.findByCode(data.code, userId);
        if (existingProducts.length > 0) {
            throw new functions.https.HttpsError("already-exists", "El código del producto ya existe.");
        }

        const id = db.collection("products").doc().id;
        const newProduct: Product = {
            ...data,
            id,
            userId,
            createdAt: new Date(),
            isActive: true,
        };

        await productRepository.create(newProduct);
        return id;
    },

    async updateProduct(id: string, data: Partial<Product>, userId: string): Promise<void> {
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

    async deleteProduct(id: string, userId: string): Promise<void> {
        const product = await productRepository.get(id);
        if (!product || product.userId !== userId) {
            throw new functions.https.HttpsError("not-found", "Producto no encontrado o no autorizado.");
        }
        await productRepository.delete(id);
    },

    async checkProductCodeExists(code: string, userId: string, excludeId?: string): Promise<boolean> {
        const products = await productRepository.findByCode(code, userId);
        if (excludeId) {
            return products.some(p => p.id !== excludeId);
        }
        return products.length > 0;
    },

    async batchCreateProducts(products: Omit<Product, 'id' | 'createdAt' | 'isActive'>[], userId: string): Promise<void> {
        const batch = db.batch();
        const existingCategories = await categoryRepository.getAll(userId);
        const existingCategoryNames = new Set(existingCategories.map(c => c.name.toUpperCase()));

        // We need to track new categories created in this batch to avoid duplicates
        const newCategoryNames = new Set<string>();

        for (const productData of products) {
            // Handle Category
            if (productData.category) {
                const upperCat = productData.category.toUpperCase();
                if (!existingCategoryNames.has(upperCat) && !newCategoryNames.has(upperCat)) {
                    const catId = db.collection("categories").doc().id;
                    const newCategory: Category = {
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
            const newProduct: Product = {
                ...productData,
                id: prodId,
                userId,
                createdAt: new Date(),
                isActive: true
            };
            const prodRef = db.collection("products").doc(prodId);
            batch.set(prodRef, newProduct);
        }

        await batch.commit();
    }
};
