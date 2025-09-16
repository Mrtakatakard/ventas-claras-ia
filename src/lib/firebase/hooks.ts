
'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth, db } from './config';
import { activateTeamMember } from './service';
import type { UserProfile } from '@/lib/types';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserProfile = useCallback(async (uid: string) => {
    const userProfileRef = doc(db, "users", uid);
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
        setUserProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        
        const userProfileRef = doc(db, "users", user.uid);
        const unsubscribeProfile = onSnapshot(userProfileRef, async (docSnap) => {
            if (docSnap.exists()) {
                const profile = { id: docSnap.id, ...docSnap.data() } as UserProfile;
                
                setUserProfile(profile);

                // If the user is pending, the function activates them.
                // The snapshot listener will then automatically receive the update.
                if (profile.status === 'pending') {
                  await activateTeamMember(user.uid);
                }
            } else {
                console.error(`User ${user.uid} authenticated but has no profile in Firestore. Signing out.`);
                setUserProfile(null);
                await signOut(auth);
            }
            // CRITICAL: Set loading to false only AFTER the first snapshot is processed.
            setLoading(false);
        }, (error) => {
            console.error("Error listening to user profile:", error);
            setUserProfile(null);
            setLoading(false);
        });

        // This is a cleanup function for the auth state change.
        // It will detach the profile listener when the user logs out.
        return () => unsubscribeProfile();

      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // This is the cleanup for the component unmounting.
    return () => unsubscribeAuth();
  }, []);

  return { user, userProfile, userId: user?.uid, loading, role: userProfile?.role, planId: userProfile?.planId, status: userProfile?.status, refreshUserProfile };
}
