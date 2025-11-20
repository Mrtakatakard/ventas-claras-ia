

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  writeBatch,
  limit,
  setDoc,
  runTransaction,
  type QueryConstraint,
  arrayUnion,
  where,
} from "firebase/firestore";
import { db, auth, storage, functions } from "./config";
import type { Client, Invoice, Product, UserProfile, Quote, Payment, ClientType, Category } from "@/lib/types";
import { sendPasswordResetEmail } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";


// Generic Functions
const getCollection = (collectionName: string) => collection(db, collectionName);

const getDocRef = (collectionName: string, id: string) =>
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

export const checkProductCodeExists = async (code: string, userId: string, currentProductId?: string): Promise<boolean> => {
  const productsCollectionRef = getCollection("products");

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


// Specific Functions

// Clients

export const getClients = (userId: string) => getDocuments<Client>("clients", userId);
export const getClient = (id: string) => getDocument<Client>("clients", id);


export const getAllClientsForAdmin = async () => {
  const clients = await getDocumentsForAdmin<Client>("clients");
  return clients;
};
export const batchAddClients = async (clients: Omit<Client, 'id'>[], userId: string) => {
  const batch = writeBatch(db);
  const clientsCollection = getCollection('clients');
  clients.forEach(clientData => {
    const docRef = doc(clientsCollection);
    batch.set(docRef, { ...clientData, userId, createdAt: new Date(), isActive: true });
  });
  await batch.commit();
}


// Client Types
export const addClientType = (data: Omit<ClientType, 'id' | 'createdAt' | 'isActive'>, userId: string) => addDocument<Omit<ClientType, 'id' | 'createdAt' | 'isActive'>>("clientTypes", data, userId);

export const getClientTypes = (userId: string) => getDocuments<ClientType>("clientTypes", userId);

export const updateClientType = (id: string, data: Partial<ClientType>) => updateDocument<Partial<ClientType>>("clientTypes", id, data);

export const deleteClientType = async (id: string) => {
  const clientsRef = collection(db, "clients");
  const q = query(clientsRef, where("clientTypeId", "==", id), limit(1));
  const snapshot = await getDocs(q);

  const activeClients = snapshot.docs.filter(doc => doc.data().isActive !== false);

  if (activeClients.length > 0) {
    throw new Error("No se puede eliminar porque este tipo de cliente está asignado a uno o más clientes activos.");
  }
  await deleteDocument("clientTypes", id);
};


// Categories
export const addCategory = (data: Omit<Category, 'id' | 'createdAt' | 'isActive'>, userId: string) => addDocument<Omit<Category, 'id' | 'createdAt' | 'isActive'>>("categories", data, userId);

export const getCategories = (userId: string) => getDocuments<Category>("categories", userId);

export const updateCategory = (id: string, data: Partial<Category>) => updateDocument<Partial<Category>>("categories", id, data);

export const deleteCategory = async (id: string) => {
  // Optional: Check if any product is using this category before deleting
  const productsRef = collection(db, "products");
  const q = query(productsRef, where("category", "==", id), where("isActive", "==", true), limit(1));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error("No se puede eliminar porque esta categoría está asignada a uno o más productos.");
  }
  await deleteDocument("categories", id);
};


// Products
const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};


export const addProduct = async (productData: Omit<Partial<Product>, 'id' | 'createdAt' | 'isActive'>, userId: string) => {
  const { image, ...data } = productData as any;
  const newProductRef = doc(collection(db, "products")); // Generate ID beforehand
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

export const getProducts = (userId: string) => getDocuments<Product>("products", userId, []);



export const updateProduct = async (id: string, productData: any) => {
  const { image, ...data } = productData;
  const docRef = getDocRef("products", id);
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


  await updateDocument("products", id, dataToUpdate);
};



export const deleteProduct = async (id: string) => {
  await deleteDocument("products", id);
};

export const getQuotes = (userId: string) => getDocuments<Quote>("quotes", userId);
export const getQuote = (id: string) => getDocument<Quote>("quotes", id);

export const getInvoices = (userId: string) => getDocuments<Invoice>("invoices", userId);
export const getInvoice = (id: string) => getDocument<Invoice>("invoices", id);

export const getAccountsReceivableFromFunction = async (): Promise<Invoice[]> => {
  const getReceivables = httpsCallable(functions, 'getAccountsReceivable');
  try {
    const result = await getReceivables();
    const data = result.data as { invoices: Invoice[] };
    return data.invoices;
  } catch (error: any) {
    console.error("Error calling getAccountsReceivable function:", error);
    throw new Error(error.message || "No se pudieron cargar los datos porque falta un índice en la base de datos. Revisa los logs de la función en la consola de Firebase para encontrar un enlace para crearlo automáticamente.");
  }
}

export const getAllInvoicesForAdmin = async () => {
  const invoices = await getDocumentsForAdmin<Invoice>("invoices");
  return invoices;
};



// Team Members (now managed as User Profiles)
export const inviteTeamMember = async (data: { name: string; email: string; role: 'admin' | 'user' }) => {
  const invite = httpsCallable(functions, 'inviteTeamMember');
  try {
    // The planId is now hardcoded to 'pro' as a default, which is a sensible default.
    // The backend function will use this.
    const result = await invite({ ...data, planId: 'pro' });
    return result;
  } catch (error: any) {
    console.error("Error calling inviteTeamMember function:", error);
    throw new Error(error.details?.message || "Ocurrió un error al invitar al miembro.");
  }
};

export const resendInvitationEmail = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const getTeamMembers = async (userId: string): Promise<UserProfile[]> => {
  const usersCollectionRef = getCollection("users");

  // Query for users invited by the current admin
  const invitedQuery = query(usersCollectionRef, where("invitedBy", "==", userId), where("isActive", "==", true));

  // Separately get the admin's own profile
  const adminProfileRef = doc(db, "users", userId);

  const [invitedSnapshot, adminDoc] = await Promise.all([
    getDocs(invitedQuery),
    getDoc(adminProfileRef)
  ]);

  const members = invitedSnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as UserProfile)
  );

  // Add the admin's own profile to the list if it exists
  if (adminDoc.exists() && adminDoc.data().isActive) {
    members.push({ id: adminDoc.id, ...adminDoc.data() } as UserProfile);
  }

  return members;
};

export const getAllTeamMembersForAdmin = async (): Promise<UserProfile[]> => {
  return await getDocumentsForAdmin<UserProfile>("users");
};


export const updateTeamMember = async (uid: string, data: { name: string; role: 'admin' | 'user' }) => {
  const userProfileRef = doc(db, "users", uid);
  await updateDoc(userProfileRef, data);
};

export const deleteTeamMember = async (uid: string) => {
  const userProfileRef = doc(db, "users", uid);
  await updateDoc(userProfileRef, { isActive: false });
};


// User Profiles
export const createUserProfile = async (uid: string, data: Omit<UserProfile, 'id' | 'createdAt' | 'isActive'>) => {
  const userProfileRef = doc(db, "users", uid);
  const userProfileSnap = await getDoc(userProfileRef);
  if (!userProfileSnap.exists()) {
    await setDoc(userProfileRef, { ...data, createdAt: new Date(), isActive: true });
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as UserProfile;
  }
  return null;
};

export const updateUserProfile = (uid: string, data: Partial<UserProfile>) => updateDocument<UserProfile>("users", uid, data);

export const getUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  const usersCollectionRef = getCollection("users");
  const q = query(usersCollectionRef, where("email", "==", email), where("isActive", "==", true), limit(1));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as UserProfile;
}

export const activateTeamMember = async (uid: string) => {
  const userProfileRef = doc(db, "users", uid);
  await updateDoc(userProfileRef, { status: 'active' });
}

