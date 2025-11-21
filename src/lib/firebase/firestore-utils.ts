import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
    type QueryConstraint,
} from "firebase/firestore";
import { db } from "./config";

export const getCollection = (collectionName: string) => collection(db, collectionName);

export const getDocRef = (collectionName: string, id: string) =>
    doc(db, collectionName, id);

export const getDocumentsForAdmin = async <T>(
    collectionName: string,
): Promise<(T & { id: string })[]> => {
    const collectionRef = getCollection(collectionName);

    const q = query(collectionRef, where("isActive", "==", true));

    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as T & { id: string })
    )
    return docs;
};

export const addDocument = async <T extends object>(
    collectionName: string,
    data: T,
    userId: string
): Promise<T & { id: string; userId: string; createdAt: Date; isActive: boolean }> => {
    const docData = { ...data, userId, createdAt: new Date(), isActive: true };
    const collectionRef = getCollection(collectionName);
    const docRef = await addDoc(collectionRef, docData);
    return { id: docRef.id, ...docData } as T & { id: string; userId: string, createdAt: Date, isActive: boolean };
};

export const updateDocument = async <T extends object>(
    collectionName: string,
    id: string,
    data: Partial<T>
) => {
    const docRef = getDocRef(collectionName, id);
    // Sanitize data to remove undefined fields
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    await updateDoc(docRef, cleanData as any);
};

export const deleteDocument = async (collectionName: string, id: string) => {
    const docRef = getDocRef(collectionName, id);
    await updateDoc(docRef, { isActive: false });
};

export const getDocument = async <T>(
    collectionName: string,
    id: string
): Promise<(T & { id: string }) | null> => {
    const docRef = getDocRef(collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().isActive !== false) {
        return { id: docSnap.id, ...docSnap.data() } as T & { id: string };
    }
    return null;
};

export const getDocuments = async <T>(
    collectionName: string,
    userId: string,
    constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> => {
    const collectionRef = getCollection(collectionName);
    const q = query(collectionRef, where("userId", "==", userId), where("isActive", "==", true), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as T & { id: string }))
};
