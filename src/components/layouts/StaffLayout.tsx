import React from 'react';
import {
  Activity, BookOpen, Boxes, CreditCard, FileUp, LayoutDashboard,
  LogOut, Rows3, UserCheck, Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { signOutStaff } from '../../lib/staffAuth';

const links = [
  ['/staff', 'Dashboard', LayoutDashboard],
  ['/staff/books', 'Books', BookOpen],
  ['/staff/series', 'Series Production', Rows3],
  ['/staff/series', 'Characters & Assets', Boxes],
  ['/staff/payments', 'Payments', CreditCard],
  ['/staff/publishing', 'Publishing', FileUp],
  ['/staff/audit-log', 'Activity Log', Activity],
  ['/staff/team', 'Team', Users],
] as const;

export const StaffLayout: React.FC = () => {
  const { staffUser } = useStaffAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#eef0f2] text-[#26292d] lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="bg-[#202428] p-4 text-white">
        <div className="border-b border-white/15 pb-4">
          <p className="text-xs font-extrabold uppercase text-[#ff8b59]">Staff Portal</p>
          <p className="mt-1 truncate text-sm font-bold">{staffUser?.displayName}</p>
        </div>
        <nav aria-label="Staff navigation" className="mt-4 grid gap-1">
          {links.map(([to, label, Icon], index) => (
            <NavLink key={`${label}-${index}`} to={to} end={to === '/staff'} className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 text-xs font-bold ${isActive ? 'bg-[#ff6321]' : 'hover:bg-white/10'}`
            }><Icon className="h-4 w-4" />{label}</NavLink>
          ))}
          {staffUser?.permissions.some((permission) => permission === 'team.approve' || permission === 'team.manage') && (
            <NavLink to="/staff/team/requests" className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 text-xs font-bold ${isActive ? 'bg-[#ff6321]' : 'hover:bg-white/10'}`
            }><UserCheck className="h-4 w-4" />Access Requests</NavLink>
          )}
          <button onClick={() => void signOutStaff().then(() => navigate('/staff/login'))} className="mt-3 flex items-center gap-2 border-t border-white/15 px-3 py-3 text-left text-xs font-bold"><LogOut className="h-4 w-4" />Sign Out</button>
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="border-b bg-white px-4 py-3"><strong>Empire Of Trust Studio</strong></header>
        <main className="min-w-0 p-3 sm:p-5"><Outlet /></main>
      </div>
    </div>
  );
};
