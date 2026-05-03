'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';

function SessionSync({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const setUserId = usePlayerStore((state) => state.setUserId);

  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
    } else {
      setUserId(null);
    }
  }, [session, setUserId]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionSync>
        {children}
      </SessionSync>
    </SessionProvider>
  );
}
