'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Club } from '../generated/prisma/client';

interface ClubContextType {
  club: Club | null;
  isMainDomain: boolean;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export function ClubProvider({
  children,
  club,
  isMainDomain,
}: {
  children: ReactNode;
  club: Club | null;
  isMainDomain: boolean;
}) {
  return (
    <ClubContext.Provider value={{ club, isMainDomain }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub(): ClubContextType {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
} 