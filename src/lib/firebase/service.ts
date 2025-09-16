

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
  await updateDoc(docRef, cleanData);
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
    const products = querySnapshot.docs.map(d => ({id: d.id, ...d.data()}));

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
export const addClient = (data: Omit<Client, 'id' | 'createdAt' | 'isActive'>, userId: string) => addDocument<Omit<Client, 'id' | 'createdAt' | 'isActive'>>("clients", data, userId);
export const getClients = (userId: string) => getDocuments<Client>("clients", userId);
export const getClient = (id: string) => getDocument<Client>("clients", id);
export const updateClient = (id: string, data: Partial<Client>) => updateDocument<Partial<Client>>("clients", id, data);
export const deleteClient = (id: string) => deleteDocument("clients", id);
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

export const batchAddProducts = async (products: Omit<Product, 'id'>[], userId: string, categories: Category[]) => {
    const batch = writeBatch(db);
    const productsCollection = getCollection('products');
    const categoriesCollection = getCollection('categories');
    
    const existingCategoryNames = new Set(categories.map(c => c.name.toUpperCase()));

    products.forEach(productData => {
        // Auto-create category if it doesn't exist
        if (productData.category && !existingCategoryNames.has(productData.category.toUpperCase())) {
            const categoryRef = doc(categoriesCollection);
            batch.set(categoryRef, {
                name: productData.category,
                description: "Categoría creada automáticamente desde importación.",
                userId: userId,
                createdAt: new Date(),
                isActive: true
            });
            existingCategoryNames.add(productData.category.toUpperCase()); // Add to set to avoid duplicates within the same batch
        }

        const docRef = doc(productsCollection);
        const dataToSet: { [key: string]: any } = { ...productData, userId, createdAt: new Date(), isActive: true };
        batch.set(docRef, dataToSet);
    });
    await batch.commit();
}


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

// Quotes
export const addQuote = (data: Omit<Quote, 'id' | 'isActive'>, userId: string) => addDocument<Omit<Quote, 'id' | 'isActive'>>("quotes", data, userId);
export const getQuotes = (userId: string) => getDocuments<Quote>("quotes", userId);
export const getQuote = (id: string) => getDocument<Quote>("quotes", id);
export const updateQuote = (id: string, data: Partial<Quote>) => updateDocument<Partial<Quote>>("quotes", id, data);
export const deleteQuote = (id: string) => deleteDocument("quotes", id);

export const convertQuoteToInvoice = async (quoteId: string, userId: string): Promise<string> => {
  return await runTransaction(db, async (transaction) => {
    const quoteRef = getDocRef("quotes", quoteId);
    const quoteDoc = await transaction.get(quoteRef);
    
    if (!quoteDoc.exists()) {
      throw new Error("La cotización no existe.");
    }
    const quote = quoteDoc.data() as Quote;

    if (quote.status === 'facturada') {
      throw new Error("Esta cotización ya ha sido facturada.");
    }
    
    // THIS LOGIC NEEDS TO BE UPDATED FOR BATCHES
    // For now, we will assume we take from the first available batch.
    // A more complex implementation would allow selecting a batch.

    const productRefs = quote.items.map(item => getDocRef("products", item.productId));
    const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

    for (let i = 0; i < productDocs.length; i++) {
        const productDoc = productDocs[i];
        const item = quote.items[i];
        if (!productDoc.exists()) {
            throw new Error(`El producto "${item.productName}" ya no existe.`);
        }
        const productData = productDoc.data() as Product;
        const totalStock = productData.batches.reduce((sum, batch) => sum + batch.stock, 0);
        if (totalStock < item.quantity) {
            throw new Error(`Stock insuficiente para "${item.productName}". Necesitas ${item.quantity}, solo hay ${totalStock}.`);
        }
    }
    
    const issueDate = new Date().toISOString().split('T')[0];
    const newInvoiceData: Omit<Invoice, 'id'> = {
      invoiceNumber: `FAC-${Date.now().toString().slice(-6)}`,
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      clientAddress: quote.clientAddress || '',
      issueDate: issueDate,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
      items: quote.items.map(item => ({...item, followUpStatus: 'pendiente'})),
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      itbis: quote.itbis,
      total: quote.total,
      status: 'pendiente',
      currency: quote.currency,
      quoteId: quoteId,
      payments: [],
      balanceDue: quote.total,
      userId: userId,
      createdAt: new Date(),
      isActive: true,
      includeITBIS: quote.includeITBIS
    };
    
    const newInvoiceRef = doc(collection(db, "invoices"));
    transaction.set(newInvoiceRef, newInvoiceData);

    // DEDUCT STOCK FROM BATCHES
    for (const item of quote.items) {
      const productRef = getDocRef("products", item.productId);
      const productDoc = await transaction.get(productRef);
      const product = productDoc.data() as Product;
      
      let quantityToDeduct = item.quantity;
      const updatedBatches = [...product.batches];

      for (const batch of updatedBatches) {
        if (quantityToDeduct === 0) break;
        
        const deductAmount = Math.min(quantityToDeduct, batch.stock);
        batch.stock -= deductAmount;
        quantityToDeduct -= deductAmount;
      }
      transaction.update(productRef, { batches: updatedBatches });
    }

    transaction.update(quoteRef, { status: 'facturada' });
    
    return newInvoiceRef.id;
  });
};


// Invoices
export const addInvoice = async (invoiceData: Omit<Invoice, 'id' | 'isActive'>, userId: string) => {
  return await runTransaction(db, async (transaction) => {
    const consolidatedItemsMap = new Map<string, InvoiceItem>();

    for (const item of invoiceData.items) {
      const key = (item.discount === 0 || !item.discount) ? item.productId : `${item.productId}-${item.id}`;
      const existing = consolidatedItemsMap.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        if (existing.numberOfPeople && item.numberOfPeople) {
          existing.numberOfPeople += item.numberOfPeople;
        }
      } else {
        consolidatedItemsMap.set(key, { ...item });
      }
    }
    const finalItems = Array.from(consolidatedItemsMap.values());
    const finalInvoiceData = { ...invoiceData, items: finalItems };

    const productQuantities = new Map<string, number>();
    for (const item of finalInvoiceData.items) {
      productQuantities.set(item.productId, (productQuantities.get(item.productId) || 0) + item.quantity);
    }
    
    const productRefs = Array.from(productQuantities.keys()).map(id => getDocRef("products", id));
    const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

    for (const [productId, totalQuantity] of productQuantities.entries()) {
      const productDoc = productDocs.find(p => p.id === productId);
      if (!productDoc || !productDoc.exists()) {
        throw new Error(`Producto con ID ${productId} no encontrado.`);
      }
      const productData = productDoc.data() as Product;
      const totalStock = productData.batches.reduce((sum, batch) => sum + batch.stock, 0);

      if (totalStock < totalQuantity) {
        throw new Error(`Stock insuficiente para ${productData.name}. Solicitado: ${totalQuantity}, Disponible: ${totalStock}`);
      }
    }

    for (const [productId, totalQuantity] of productQuantities.entries()) {
      const productRef = getDocRef("products", productId);
      const product = productDocs.find(p => p.id === productId)?.data() as Product;
      
      let quantityToDeduct = totalQuantity;
      const updatedBatches = [...product.batches];

      for (const batch of updatedBatches) {
        if (quantityToDeduct === 0) break;
        
        const deductAmount = Math.min(quantityToDeduct, batch.stock);
        batch.stock -= deductAmount;
        quantityToDeduct -= deductAmount;
      }
      transaction.update(productRef, { batches: updatedBatches });
    }

    const newInvoiceRef = doc(collection(db, "invoices"));
    const fullInvoiceData = {
      ...finalInvoiceData,
      items: finalInvoiceData.items.map(item => ({ ...item, followUpStatus: 'pendiente' })),
      payments: [],
      balanceDue: finalInvoiceData.total,
      userId,
      createdAt: new Date(),
      isActive: true,
    };
    transaction.set(newInvoiceRef, fullInvoiceData);
    return newInvoiceRef.id;
  });
};

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

export const updateInvoice = async (invoiceId: string, updatedData: Partial<Omit<Invoice, 'id' | 'isActive'>>, userId: string) => {
  return await runTransaction(db, async (transaction) => {
    const invoiceRef = doc(db, "invoices", invoiceId);
    const invoiceDoc = await transaction.get(invoiceRef);

    if (!invoiceDoc.exists() || invoiceDoc.data().userId !== userId) {
      throw new Error("Factura no encontrada o no tienes permiso para editarla.");
    }
    const originalInvoice = invoiceDoc.data() as Invoice;

    if (originalInvoice.status === 'pagada' && updatedData.items) {
      throw new Error("No se pueden editar los artículos de facturas que ya han sido pagadas.");
    }
    
    if (updatedData.items && Object.keys(updatedData).length === 1) {
        transaction.update(invoiceRef, { items: updatedData.items });
        return;
    }

    const allProductIds = new Set([
      ...originalInvoice.items.map(i => i.productId),
      ...(updatedData.items || []).map(i => i.productId)
    ]);
    const productRefs = Array.from(allProductIds).map(id => doc(db, "products", id));
    const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
    const productsMap = new Map<string, any>();
    productDocs.forEach(pDoc => {
      if (pDoc.exists()) productsMap.set(pDoc.id, pDoc.data());
    });

    const stockAdjustments = new Map<string, number>();

    if (updatedData.items) {
      const consolidatedItemsMap = new Map<string, InvoiceItem>();
      for (const item of updatedData.items) {
        const key = (item.discount === 0 || !item.discount) ? item.productId : `${item.productId}-${item.id}`; 
        const existing = consolidatedItemsMap.get(key);
        if (existing) {
          existing.quantity += item.quantity;
          if (existing.numberOfPeople && item.numberOfPeople) existing.numberOfPeople += item.numberOfPeople;
        } else {
          consolidatedItemsMap.set(key, { ...item });
        }
      }
      updatedData.items = Array.from(consolidatedItemsMap.values());

      const originalQuantities = new Map<string, number>();
      originalInvoice.items.forEach(item => {
        originalQuantities.set(item.productId, (originalQuantities.get(item.productId) || 0) + item.quantity);
      });

      const newQuantities = new Map<string, number>();
      updatedData.items.forEach(item => {
        newQuantities.set(item.productId, (newQuantities.get(item.productId) || 0) + item.quantity);
      });

      for (const productId of allProductIds) {
        const originalQty = originalQuantities.get(productId) || 0;
        const newQty = newQuantities.get(productId) || 0;
        const adjustment = originalQty - newQty;
        if (adjustment === 0) continue;

        const productData = productsMap.get(productId);
        if (!productData) throw new Error(`Uno de los productos en la factura ya no existe.`);
        
        // Stock adjustment logic needs to be batch-aware now. This is a simplification.
        // For now, we add/remove from total stock and let the user manage batches manually.
        // A more complex implementation would require specifying which batch to adjust.
        const totalStock = productData.batches.reduce((sum: number, batch: any) => sum + batch.stock, 0);

        if ((totalStock + adjustment) < 0) throw new Error(`Stock insuficiente para "${productData.name}".`);
        
        stockAdjustments.set(productId, adjustment);
      }
    }

    for (const [productId, adjustment] of stockAdjustments.entries()) {
      const productRef = doc(db, "products", productId);
      const productData = productsMap.get(productId) as Product;
      
      // Simplified stock adjustment: apply to the first batch with enough stock.
      const updatedBatches = [...productData.batches];
      let amountToAdjust = Math.abs(adjustment);

      if (adjustment > 0) { // returning stock
        updatedBatches[0].stock += amountToAdjust;
      } else { // deducting stock
        for (const batch of updatedBatches) {
           if (amountToAdjust === 0) break;
           const deductAmount = Math.min(amountToAdjust, batch.stock);
           batch.stock -= deductAmount;
           amountToAdjust -= deductAmount;
        }
      }
      transaction.update(productRef, { batches: updatedBatches });
    }

    const total = updatedData.total ?? originalInvoice.total;
    const totalPayments = (originalInvoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const newBalanceDue = total - totalPayments;
    let newStatus: Invoice['status'] = updatedData.status ?? originalInvoice.status;

    if (updatedData.total !== undefined) {
      if (newBalanceDue <= 0.001) newStatus = 'pagada';
      else if (newBalanceDue < total) newStatus = 'parcialmente pagada';
      else newStatus = 'pendiente';
    }

    const finalUpdateData = { ...updatedData, balanceDue: newBalanceDue, status: newStatus };
    transaction.update(invoiceRef, finalUpdateData);
  });
};

export const deleteInvoice = async (id: string) => {
  const deleteInvoiceFunction = httpsCallable(functions, 'deleteInvoiceAndAdjustStock');
  try {
    await deleteInvoiceFunction({ invoiceId: id });
  } catch (error: any) {
    console.error("Error calling deleteInvoiceAndAdjustStock function:", error);
    throw new Error(error.details || "Ocurrió un error al eliminar la factura.");
  }
};

export const getAllInvoicesForAdmin = async () => {
    const invoices = await getDocumentsForAdmin<Invoice>("invoices");
    return invoices;
};

export const addPaymentToInvoice = async (invoiceId: string, paymentData: Omit<Payment, 'id' | 'receiptNumber' | 'currency' | 'status'> & { image?: File }, userId: string): Promise<Payment> => {
    const { image, ...data } = paymentData;
    let imageUrl = '';
    const paymentId = new Date().toISOString() + Math.random();

    if (image instanceof File) {
        imageUrl = await uploadFile(image, `users/${userId}/invoices/${invoiceId}/payments/${paymentId}/${image.name}`);
    }

    return await runTransaction(db, async (transaction) => {
        const invoiceRef = doc(db, "invoices", invoiceId);
        const invoiceDoc = await transaction.get(invoiceRef);
        if (!invoiceDoc.exists() || invoiceDoc.data().userId !== userId) {
            throw new Error("Factura no encontrada o no tienes permiso para modificarla.");
        }

        const invoice = invoiceDoc.data() as Invoice;

        const currentBalance = Math.round((invoice.balanceDue ?? invoice.total) * 100) / 100;

        if (data.amount <= 0) {
            throw new Error("El monto del pago debe ser mayor que cero.");
        }
        if (data.amount > currentBalance + 0.001) {
            throw new Error(`El monto del pago (${data.amount.toFixed(2)}) no puede ser mayor que el balance pendiente de ${currentBalance.toFixed(2)}.`);
        }
        
        const newPayment: Payment = {
            id: paymentId,
            receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
            amount: data.amount,
            paymentDate: data.paymentDate,
            method: data.method,
            note: data.note || '',
            imageUrl: imageUrl || '',
            currency: invoice.currency,
            status: 'pagado', // payment status
        };
        
        const newBalanceDue = Math.round((currentBalance - data.amount) * 100) / 100;

        let newStatus: Invoice['status'] = invoice.status;
        let finalBalance = newBalanceDue;

        if (newBalanceDue <= 0.001) {
            newStatus = 'pagada';
            finalBalance = 0;
        } else if (newBalanceDue < invoice.total) {
            newStatus = 'parcialmente pagada';
        }

        transaction.update(invoiceRef, {
            payments: arrayUnion(newPayment),
            balanceDue: finalBalance,
            status: newStatus
        });
        
        return newPayment;
    });
};

// Team Members (now managed as User Profiles)
export const inviteTeamMember = async (data: { name: string; email: string; role: 'admin' | 'user'}) => {
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

    