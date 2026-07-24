import React, { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';

export interface StaffRouteState {
  resolved: boolean;
  user: User | null;
}

export const StaffRouteContext = createContext<StaffRouteState>({
  resolved: false,
  user: null,
});

export const useStaffRoute = () => useContext(StaffRouteContext);

export const StaffRouteProvider: React.FC<React.PropsWithChildren<StaffRouteState>> = ({
  resolved, user, children,
}) => (
  <StaffRouteContext.Provider value={{ resolved, user }}>
    {children}
  </StaffRouteContext.Provider>
);
