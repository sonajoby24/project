
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from 'react';

import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

const ADMIN_EMAIL = 'sonajoby530@gmail.com';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isAppUser: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          setUser(null);
          setUserRole(null);
          return;
        }

        // Refresh the user's verification status.
        await firebaseUser.reload();

        const currentUser = auth.currentUser;

        // Block users whose email is not verified.
        if (!currentUser || !currentUser.emailVerified) {
          setUser(null);
          setUserRole(null);
          await firebaseSignOut(auth);
          return;
        }

        setUser(currentUser);

        // Fetch the user's role from Firestore.
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists() && userDoc.data().role) {
            setUserRole(userDoc.data().role);
          } else {
            setUserRole('customer');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('customer');
        }
      } catch (error) {
        console.error('Authentication state error:', error);
        setUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = useMemo(
    () => user?.email === ADMIN_EMAIL,
    [user]
  );

  const isAppUser = useMemo(
    () => isAdmin || userRole === 'user',
    [isAdmin, userRole]
  );

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserRole(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        isAdmin,
        isAppUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
