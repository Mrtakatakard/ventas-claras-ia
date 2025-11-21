import { doc, query, where, getDocs, updateDoc, setDoc, getDoc, limit } from "firebase/firestore";
import { db, auth, functions } from "../firebase/config";
import { UserProfile } from "../types";
import { COLLECTIONS } from "../constants";
import {
    getCollection,
    getDocumentsForAdmin,
    updateDocument
} from "../firebase/firestore-utils";
import { httpsCallable } from "firebase/functions";
import { sendPasswordResetEmail } from "firebase/auth";

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
    const usersCollectionRef = getCollection(COLLECTIONS.USERS);

    // Query for users invited by the current admin
    const invitedQuery = query(usersCollectionRef, where("invitedBy", "==", userId), where("isActive", "==", true));

    // Separately get the admin's own profile
    const adminProfileRef = doc(db, COLLECTIONS.USERS, userId);

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
    return await getDocumentsForAdmin<UserProfile>(COLLECTIONS.USERS);
};

export const updateTeamMember = async (uid: string, data: { name: string; role: 'admin' | 'user' }) => {
    const userProfileRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userProfileRef, data);
};

export const deleteTeamMember = async (uid: string) => {
    const userProfileRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userProfileRef, { isActive: false });
};

// User Profiles
export const createUserProfile = async (uid: string, data: Omit<UserProfile, 'id' | 'createdAt' | 'isActive'>) => {
    const userProfileRef = doc(db, COLLECTIONS.USERS, uid);
    const userProfileSnap = await getDoc(userProfileRef);
    if (!userProfileSnap.exists()) {
        await setDoc(userProfileRef, { ...data, createdAt: new Date(), isActive: true });
    }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
};

export const updateUserProfile = (uid: string, data: Partial<UserProfile>) => updateDocument<UserProfile>(COLLECTIONS.USERS, uid, data);

export const getUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
    const usersCollectionRef = getCollection(COLLECTIONS.USERS);
    const q = query(usersCollectionRef, where("email", "==", email), where("isActive", "==", true), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as UserProfile;
}

export const activateTeamMember = async (uid: string) => {
    const userProfileRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userProfileRef, { status: 'active' });
}
