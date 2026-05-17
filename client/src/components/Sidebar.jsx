import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Receipt, ShoppingCart } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Sidebar() {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/add-data', icon: PlusCircle, label: 'Add Data' },
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/purchases', icon: ShoppingCart, label: 'Purchases' },
  ];

  return (
    <aside className="w-64 bg-dark-bg border-r border-dark-border flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-dark-border">
        <h1 className="text-xl font-bold text-white tracking-wide">
          Golden <span className="text-brand-primary">Handi</span>
        </h1>
      </div>
      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                "text-sm font-medium",
                isActive 
                  ? "bg-dark-card text-brand-primary" 
                  : "text-dark-muted hover:bg-dark-card/50 hover:text-white"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-dark-border">
        <div className="text-xs text-dark-muted">
          v1.0.0 &copy; {new Date().getFullYear()}
        </div>
      </div>
    </aside>
  );
}
