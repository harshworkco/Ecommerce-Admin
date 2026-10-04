import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon, ProductsIcon, OrdersIcon,
  UsersIcon, PaymentsIcon, AnalyticsIcon, StoreIcon,
} from './Icons';

const links = [
  { to: '/', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/products', label: 'Products', Icon: ProductsIcon },
  { to: '/orders', label: 'Orders', Icon: OrdersIcon },
  { to: '/users', label: 'Users', Icon: UsersIcon },
  { to: '/payments', label: 'Payments', Icon: PaymentsIcon },
  { to: '/analytics', label: 'Analytics', Icon: AnalyticsIcon },
];

export default function Layout({ children }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><StoreIcon size={22} /></span>
          <div>
            <div className="brand-name">ShopAdmin</div>
            <div className="brand-sub">{admin?.email || 'Admin panel'}</div>
          </div>
        </div>
        <nav className="nav">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span className="nav-icon"><Icon size={18} /></span>{label}
            </NavLink>
          ))}
        </nav>
        <button className="btn btn-danger logout-btn" onClick={handleLogout}>Logout</button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
