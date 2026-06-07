
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, LogOut, User, Settings, Activity, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import NotificationBell from '@/components/NotificationBell.jsx';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout, currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const isSuperAdmin = currentUser?.role === 'admin' || currentUser?.role === 'SUPER_ADMIN';

  const publicNav = [
    { name: 'Home', path: '/' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Marketplace', path: '/marketplace' },
    { name: 'Research Lab', path: '/research-lab' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
    { name: 'Blog', path: 'https://blog.starksglobalgroup.net/blog', external: true },
    { name: 'Why Trust Us', path: '/why-trust-us' },
  ];

  const privateNav = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Builder', path: '/builder' },
    { name: 'Connections', path: '/connections' },
    { name: 'My Systems', path: '/systems' },
    { name: 'Marketplace', path: '/marketplace' },
    { name: 'Blueprints', path: '/blueprints' },
    { name: 'Blog', path: 'https://blog.starksglobalgroup.net/blog', external: true },
  ];

  const navItems = isAuthenticated ? privateNav : publicNav;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center shrink-0 group py-2">
            <img 
              src="https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/4c35c9e2294c3d0e16fb5ed3a74c5ddc.png" 
              alt="Starks Global Group" 
              className="h-10 sm:h-12 w-auto object-contain group-hover:opacity-90 transition-opacity" 
            />
          </Link>

          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              item.external ? (
                <a 
                  key={item.name}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center text-muted-foreground hover:bg-primary/10 hover:text-blue-500"
                >
                  {item.icon && item.icon}
                  {item.name}
                </a>
              ) : (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center ${
                    isActive(item.path) && item.path !== '/'
                      ? 'bg-primary/10 text-primary' 
                      : (isActive(item.path) && location.pathname === '/') 
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-primary/10 hover:text-blue-500'
                  }`}
                >
                  {item.icon && item.icon}
                  {item.name}
                </Link>
              )
            ))}
          </nav>

          <div className="hidden lg:flex items-center space-x-4 shrink-0">
            {isAuthenticated && <NotificationBell />}
            {isAuthenticated ? (
              <div className="relative">
                <button 
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-blue-500 transition-colors py-2 px-3 rounded-md hover:bg-primary/5"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                    <User className="w-4 h-4" />
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {isAccountOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl py-1 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                      <p className="text-sm font-bold text-foreground truncate">{currentUser?.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                    </div>
                    <div className="p-1">
                      {isSuperAdmin && (
                        <Link to="/admin" onClick={() => setIsAccountOpen(false)} className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary rounded-md flex items-center gap-2 transition-colors">
                          <ShieldCheck className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      <Link to="/dashboard/profile" onClick={() => setIsAccountOpen(false)} className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary rounded-md flex items-center gap-2 transition-colors">
                        <User className="w-4 h-4" /> Profile
                      </Link>
                      <Link to="/dashboard/settings" onClick={() => setIsAccountOpen(false)} className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary rounded-md flex items-center gap-2 transition-colors">
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                    </div>
                    <div className="border-t border-border p-1">
                      <button 
                        onClick={() => { setIsAccountOpen(false); logout(); navigate('/'); }}
                        className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-foreground hover:text-blue-500 transition-colors px-4 py-2">
                  Log In
                </Link>
                <Link to="/signup" className="saas-button py-2.5 px-6 text-sm shadow-md shadow-primary/20">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <div className="lg:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-foreground p-2 hover:bg-primary/10 hover:text-blue-500 rounded-md transition-colors">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card px-4 py-4 space-y-4 shadow-2xl absolute w-full z-50">
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => (
              item.external ? (
                <a 
                  key={item.name}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center text-foreground hover:bg-primary/10 hover:text-blue-500"
                >
                  {item.icon && item.icon}
                  {item.name}
                </a>
              ) : (
                <Link 
                  key={item.path}
                  to={item.path} 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center ${
                    isActive(item.path) && item.path !== '/'
                      ? 'bg-primary/10 text-primary border-l-2 border-primary' 
                      : (isActive(item.path) && location.pathname === '/')
                        ? 'bg-primary/10 text-primary border-l-2 border-primary'
                        : 'text-foreground hover:bg-primary/10 hover:text-blue-500'
                  }`}
                >
                  {item.icon && item.icon}
                  {item.name}
                </Link>
              )
            ))}
            
            {isAuthenticated ? (
              <div className="pt-4 mt-2 border-t border-border flex flex-col space-y-1">
                {isSuperAdmin && (
                  <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Admin Panel
                  </Link>
                )}
                <Link to="/dashboard/profile" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-blue-500">Profile</Link>
                <Link to="/dashboard/settings" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-blue-500">Settings</Link>
                <button onClick={() => { setIsMobileMenuOpen(false); logout(); navigate('/'); }} className="px-4 py-3 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 text-left">Log Out</button>
              </div>
            ) : (
              <div className="pt-4 mt-2 border-t border-border flex flex-col space-y-3">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-blue-500 text-center border border-border">Log In</Link>
                <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="saas-button w-full">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
