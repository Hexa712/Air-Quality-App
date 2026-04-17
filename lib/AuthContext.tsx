"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    switchAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => {},
    switchAccount: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | null = null;

        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            if (authUser) {
                // When auth user exists, listen to their Firestore document
                unsubscribeSnapshot = onSnapshot(doc(db, 'users', authUser.uid), (docSnap) => {
                    if (!docSnap.exists()) {
                        console.log("User document does not exist yet. Waiting for it to be created.");
                    }
                }, (error) => {
                    console.error("Error listening to user document", error);
                });
            } else {
                // No auth user, unsubscribe from firestore if we were listening
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot();
                    unsubscribeSnapshot = null;
                }
            }
            setUser(authUser);
            setLoading(false);
        });

        return () => {
            unsubscribe();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, []);

    const logout = async () => {
        try {
            await signOut(auth);
            window.location.href = '/login';
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    const switchAccount = async () => {
        try {
            // Force account selection for Google
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            await signInWithPopup(auth, provider);
            window.location.href = '/profile';
        } catch (error) {
            console.error("Error switching account", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, switchAccount }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
