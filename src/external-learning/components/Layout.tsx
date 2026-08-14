
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Workflow, 
  LogOut, 
  Users,
  TrendingUp,
  ShieldCheck,
  User,
  Stethoscope,
  ShieldAlert,
  Database,
  Search,
  Bell,
  Menu,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (id: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, user, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      const addScript = document.createElement('script');
      addScript.setAttribute('src', 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
      addScript.setAttribute('id', 'google-translate-script');
      document.body.appendChild(addScript);

      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement({
          pageLanguage: 'en',
          layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element');
      };
    }
  }, []);

  if (!user) return <>{children}</>;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'team_member'] },
    { id: 'projects', label: 'Learning Videos', icon: ClipboardList, roles: ['admin', 'team_member'] },
    { id: 'image_learning', label: 'Learning Images', icon: ImageIcon, roles: ['admin', 'team_member'] },
    { id: 'workflows', label: 'Workflows', icon: Workflow, roles: ['admin'] },
    { id: 'manage_image_learning', label: 'Manage Image Learning', icon: ImageIcon, roles: ['admin'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['admin'] },
  ];

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'System Administrator';
      case 'clinician': return 'Medical Clinician';
      case 'team_member': return 'Production Team';
      default: return role;
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <ShieldAlert size={12} className="text-amber-500" />;
      case 'clinician': return <Stethoscope size={12} className="text-emerald-500" />;
      default: return <User size={12} className="text-sky-500" />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Light Theme Sidebar */}
      <aside className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-[280px] bg-white border-r border-slate-200 flex flex-col z-40 shadow-sm`}>
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 to-sky-400 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-sky-500/20">E</div>
            <span className="text-xl font-black text-slate-900 tracking-tight">E <span className="text-sky-500">Learning</span></span>
          </div>
        </div>

        <nav className="flex-1 px-5 py-8 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="px-4 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Platform Nav</div>
          {menuItems.filter(item => item.roles.includes(user.role)).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-sky-50 text-sky-600 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-sky-500 transition-colors'} />
                <span className="text-sm tracking-wide">{item.label}</span>
                {isActive && <div className="ml-auto w-1 h-5 bg-sky-500 rounded-full" />}
              </button>
            );
          })}

          <div className="pt-8">
            <div className="px-4 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Language</div>
            <div className="px-4">
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                onChange={(e) => {
                  const gtSelect = document.querySelector('.goog-te-combo');
                  if (gtSelect) {
                    (gtSelect as HTMLSelectElement).value = e.target.value;
                    gtSelect.dispatchEvent(new Event('change'));
                  }
                }}
              >
                <option value="">English (Default)</option>
                <option value="es">Español (Spanish)</option>
                <option value="fr">Français (French)</option>
                <option value="de">Deutsch (German)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="zh-CN">中文 (Chinese)</option>
                <option value="ja">日本語 (Japanese)</option>
                <option value="ko">한국어 (Korean)</option>
              </select>
              <div id="google_translate_element" className="hidden"></div>
            </div>
          </div>
        </nav>

        <div className="p-5 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-2xl flex items-center space-x-4 hover:bg-slate-100 transition-colors cursor-pointer group border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white font-black text-sm shadow-md">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate">{getRoleLabel(user.role)}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onLogout(); }}
              className="p-2 text-slate-400 hover:text-red-500 transition-all rounded-lg opacity-0 group-hover:opacity-100"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#f8fafc]">
        {/* Glassmorphism Top Header */}
        <header className="h-20 glass-panel border-b border-slate-200/60 flex items-center justify-between px-6 md:px-10 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <button 
              className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <span className="text-slate-800 font-bold hidden sm:inline">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <span className="hidden sm:inline">Overview</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="w-64 bg-slate-100/50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-slate-700 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 max-w-[1600px] w-full mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
