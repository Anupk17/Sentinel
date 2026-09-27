import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Activity, Scale, Bell, MessageSquare, Clock, Settings, User, MonitorPlay } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Activity },
  { name: 'Disputes', path: '/disputes', icon: Scale },
  { name: 'Alerts', path: '/alerts', icon: Bell },
  { name: 'Communications', path: '/communications', icon: MessageSquare },
  { name: 'Timeline', path: '/timeline', icon: Clock },
  { name: 'Simulation', path: '/simulation', icon: MonitorPlay },
];

export default function Sidebar() {
  return (
    <div className="w-16 hover:w-56 transition-all duration-300 h-screen bg-card border-r border-border flex flex-col justify-between overflow-hidden group">
      <div>
        <Link to="/" className="h-14 flex items-center px-4 border-b border-border hover:bg-elevated/40 transition-colors">
          <div className="w-8 h-8 rounded bg-accent-cyan flex items-center justify-center font-bold text-background shrink-0">
            S
          </div>
          <span className="ml-4 font-bold tracking-widest text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            SENTINEL
          </span>
        </Link>
        
        <nav className="mt-4 flex flex-col gap-2 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex items-center px-3 py-2 rounded-md transition-colors whitespace-nowrap",
                isActive 
                  ? "bg-accent-cyan/10 text-accent-cyan" 
                  : "text-secondary hover:text-primary hover:bg-elevated"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-2 border-t border-border flex flex-col gap-2">
        <button className="flex items-center px-3 py-2 rounded-md text-secondary hover:text-primary hover:bg-elevated whitespace-nowrap">
          <Settings className="w-5 h-5 shrink-0" />
          <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
            Settings
          </span>
        </button>
        <div className="flex flex-col gap-1 mt-2">
          {['OP1', 'OP2', 'OP3'].map((op, i) => (
            <div key={op} className="flex items-center px-3 py-1 rounded-md text-xs whitespace-nowrap cursor-pointer hover:bg-elevated">
              <div className={clsx(
                "w-2 h-2 rounded-full shrink-0",
                i === 0 ? "bg-accent-green" : "bg-border"
              )} />
              <span className="ml-3 font-mono text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                {op} Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
