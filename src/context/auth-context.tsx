
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';

import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  multiFactor,
} from 'firebase/auth';

import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

const ADMIN_EMAIL = 'sonajoby530@gmail.com';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isAppUser: boolean;
  mfaEnrolled: boolean;
  mfaEnrollmentRequired: boolean;
  loading: boolean;
  refreshAuthState: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [mfaEnrollmentRequired, setMfaEnrollmentRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  // Activate the user only after email verification and MFA enrollment.
  const activateUser = useCallback(async (firebaseUser: User): Promise<boolean> => {
    await firebaseUser.reload();

    const currentUser = auth.currentUser;

    if (!currentUser || !currentUser.emailVerified) {
      setUser(null);
      setUserRole(null);
      setMfaEnrolled(false);
      setMfaEnrollmentRequired(false);

      if (currentUser) {
        await firebaseSignOut(auth);
      }

      return false;
    }

    const enrolledFactors = multiFactor(currentUser).enrolledFactors;
    const hasMfa = enrolledFactors.length > 0;

    setMfaEnrolled(hasMfa);

    if (!hasMfa) {
      // Keep Firebase's temporary session for SMS enrollment,
      // but do not grant access to the application.
      setUser(null);
      setUserRole(null);
      setMfaEnrollmentRequired(true);
      return false;
    }

    setMfaEnrollmentRequired(false);
    setUser(currentUser);

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

    return true;
  }, []);

  // Called after successful SMS enrollment or verification.
  const refreshAuthState = useCallback(async (): Promise<boolean> => {
    setLoading(true);

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setUser(null);
        setUserRole(null);
        setMfaEnrolled(false);
        setMfaEnrollmentRequired(false);
        return false;
      }

      return await activateUser(currentUser);
    } catch (error) {
      console.error('Error refreshing authentication state:', error);
      setUser(null);
      setUserRole(null);
      setMfaEnrolled(false);
      setMfaEnrollmentRequired(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [activateUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          setUser(null);
          setUserRole(null);
          setMfaEnrolled(false);
          setMfaEnrollmentRequired(false);
          return;
        }

        await activateUser(firebaseUser);
      } catch (error) {
        console.error('Authentication state error:', error);
        setUser(null);
        setUserRole(null);
        setMfaEnrolled(false);
        setMfaEnrollmentRequired(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [activateUser]);

  const isAdmin = useMemo(
    () => user?.email === ADMIN_EMAIL,
    [user]
  );

  const isAppUser = useMemo(
    () => Boolean(user && mfaEnrolled),
    [user, mfaEnrolled]
  );

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserRole(null);
    setMfaEnrolled(false);
    setMfaEnrollmentRequired(false);
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
        mfaEnrolled,
        mfaEnrollmentRequired,
        refreshAuthState,
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
