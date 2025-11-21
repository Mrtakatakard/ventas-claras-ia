import { doc, collection, setDoc, getDoc, query, where, getDocs, limit } from "firebase/firestore";
import { db, storage } from "../firebase/config";
import { Product, Category } from "../types";
import { COLLECTIONS } from "../constants";
import {
    getDocuments,
    addDocument,
    updateDocument,
    deleteDocument,
    getCollection,
    getDocRef
} from "../firebase/firestore-utils";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

// Helper for file upload
const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
};

// Categories
export const addCategory = (data: Omit<Category, 'id' | 'createdAt' | 'isActive'>, userId: string) =>
    addDocument<Omit<Category, 'id' | 'createdAt' | 'isActive'>>(COLLECTIONS.CATEGORIES, data, userId);

export const getCategories = (userId: string) => getDocuments<Category>(COLLECTIONS.CATEGORIES, userId);

export const updateCategory = (id: string, data: Partial<Category>) =>
    updateDocument<Partial<Category>>(COLLECTIONS.CATEGORIES, id, data);

export const deleteCategory = async (id: string) => {
    // Check if any product is using this category before deleting
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    const q = query(productsRef, where("category", "==", id), where("isActive", "==", true), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        throw new Error("No se puede eliminar porque esta categoría está asignada a uno o más productos.");
    }
    await deleteDocument(COLLECTIONS.CATEGORIES, id);
};

// Products
export const addProduct = async (productData: Omit<Partial<Product>, 'id' | 'createdAt' | 'isActive'>, userId: string) => {
    const { image, ...data } = productData as any;
    const newProductRef = doc(collection(db, COLLECTIONS.PRODUCTS)); // Generate ID beforehand
    let imageUrl = '';

    if (image instanceof File) {
        imageUrl = await uploadFile(image, `users/${userId}/products/${newProductRef.id}/${image.name}`);
    } else if (typeof image === 'string') {
        imageUrl = image;
    }

    const finalData: Omit<Product, 'id'> = {
        code: data.code,
        name: data.name,
        category: data.category,
        currency: data.currency,
        batches: data.batches,
        // Computed fields from first batch
        price: data.batches?.[0]?.price || 0,
        cost: data.batches?.[0]?.cost,
        stock: data.batches?.reduce((sum: number, batch: any) => sum + batch.stock, 0) || 0,
        description: data.description || '',
        notificationThreshold: data.notificationThreshold ?? 10,
        restockTimeDays: data.restockTimeDays ?? null,
        imageUrl: imageUrl,
        isTaxExempt: data.isTaxExempt || false,
        isActive: true,
        userId: userId,
        createdAt: new Date(),
    };

    await setDoc(newProductRef, finalData);
    return newProductRef.id;
};

export const getProducts = (userId: string) => getDocuments<Product>(COLLECTIONS.PRODUCTS, userId, []);

export const updateProduct = async (id: string, productData: any) => {
    const { image, ...data } = productData;
    const docRef = getDocRef(COLLECTIONS.PRODUCTS, id);
    const productSnap = await getDoc(docRef);
    if (!productSnap.exists()) throw new Error("Product not found");
    const userId = productSnap.data().userId;

    const dataToUpdate: { [key: string]: any } = { ...data };

    if (image instanceof File) {
        dataToUpdate.imageUrl = await uploadFile(image, `users/${userId}/products/${id}/${image.name}`);
    } else if (productData.hasOwnProperty('image') && typeof productData.image !== 'string') {
        dataToUpdate.imageUrl = '';
    }

    if (dataToUpdate.restockTimeDays === undefined) {
        dataToUpdate.restockTimeDays = null;
    }

    if (data.isTaxExempt === undefined) {
        data.isTaxExempt = false
    }

    await updateDocument(COLLECTIONS.PRODUCTS, id, dataToUpdate);
};

export const deleteProduct = async (id: string) => {
    await deleteDocument(COLLECTIONS.PRODUCTS, id);
};

export const checkProductCodeExists = async (code: string, userId: string, currentProductId?: string): Promise<boolean> => {
    const productsCollectionRef = getCollection(COLLECTIONS.PRODUCTS);

    const q = query(
        productsCollectionRef,
        where("userId", "==", userId),
        where("code", "==", code),
        where("isActive", "==", true)
    );

    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (products.length === 0) {
        return false;
    }

    if (currentProductId) {
        return products.some(p => p.id !== currentProductId);
    }

    return true;
};
