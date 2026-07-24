import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useStaffRoute } from '../../contexts/StaffRouteContext';

export const RequireStaff: React.FC = () => {
  const { resolved, user } = useStaffRoute();
  const location = useLocation();
  if (!resolved) {
    return <div role="status" className="grid min-h-[45vh] place-items-center text-sm font-bold">Verifying staff session…</div>;
  }
  if (!user || user.isAnonymous) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};
