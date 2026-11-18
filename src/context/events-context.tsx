
'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';

import type { AppEvent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

interface EventsContextType {
  events: AppEvent[];
  logEvent: (event: Omit<AppEvent, 'id' | 'timestamp'>) => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AppEvent[]>([]);

  const { toast } = useToast();
  const { user, loading: authLoading, isAppUser } = useAuth();

  // Listen only for verified, authenticated users.
  useEffect(() => {
    if (authLoading || !user || !isAppUser || !user.emailVerified) {
      setEvents([]);
      return;
    }

    const eventsCollectionRef = collection(db, 'events');
    const q = query(eventsCollectionRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventsData = snapshot.docs.map((eventDoc) => {
          const data = eventDoc.data();

          return {
            ...data,
            id: eventDoc.id,
            timestamp: data.timestamp
              ? data.timestamp.toDate()
              : new Date(),
          } as AppEvent;
        });

        setEvents(eventsData);
      },
      (error) => {
        console.error('Events listener error:', error);
        setEvents([]);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, isAppUser]);

  // Log events only for verified users.
  const logEvent = useCallback(
    async (eventData: Omit<AppEvent, 'id' | 'timestamp'>) => {
      if (authLoading || !user || !isAppUser || !user.emailVerified) {
        console.warn('Event not logged: no verified authenticated user.');
        return;
      }

      try {
        const eventsCollectionRef = collection(db, 'events');

        await addDoc(eventsCollectionRef, {
          ...eventData,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error logging event:', error);
      }
    },
    [user, authLoading, isAppUser]
  );

  // Notify when a recent login event appears.
  useEffect(() => {
    if (!user || !user.emailVerified || !isAppUser || events.length === 0) {
      return;
    }

    const latestEvent = events[0];

    const isRecent =
      Date.now() - latestEvent.timestamp.getTime() < 5000;

    if (latestEvent.type === 'login' && isRecent) {
      toast({
        title: 'User Logged In',
        description: `${latestEvent.userEmail} just signed in.`,
      });
    }
  }, [events, toast, user, isAppUser]);

  return (
    <EventsContext.Provider value={{ events, logEvent }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);

  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }

  return context;
}
