"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Club {
  id: string;
  name: string;
  subdomain: string;
  logoUrl?: string;
  // Добавьте другие поля клуба по необходимости
}

interface ClubContextType {
  club: Club | null;
  setClub: (club: Club | null) => void;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const ClubContextProvider = ({ children }: { children: ReactNode }) => {
  const [club, setClub] = useState<Club | null>(null);

  useEffect(() => {
    // Получаем subdomain из window.location.host
    if (typeof window === 'undefined') return;
    const host = window.location.host;
    const hostParts = host.split('.');
    const isLocalhost = host.includes('localhost');
    const hasSubdomain = isLocalhost ? hostParts.length >= 2 : hostParts.length >= 3;
    if (!hasSubdomain) return;
    const subdomain = hostParts[0];
    if (!subdomain) return;
    // Запрашиваем клуб по subdomain
    fetch(`/api/clubs/by-subdomain?subdomain=${subdomain}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.id) setClub(data);
      })
      .catch(() => {});
  }, []);

  return (
    <ClubContext.Provider value={{ club, setClub }}>
      {children}
    </ClubContext.Provider>
  );
};

export const useClub = () => {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error("useClub must be used within a ClubContextProvider");
  }
  return context;
}; 