import React, { createContext, useContext, useEffect, useState } from 'react';

const PermissionsContext = createContext<string[] | null>(null);

export const usePermissions = () => useContext(PermissionsContext);

export const PermissionsProvider = ({ userId, children }: { userId: string, children: React.ReactNode }) => {
  const [permissions, setPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}/permissions`)
      .then(res => res.json())
      .then(data => setPermissions(data.filter((p: any) => p.allowed).map((p: any) => p.code)));
  }, [userId]);

  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}; 