import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, Hash, Bell, Users, MessageSquare, Sparkles, 
  Star, Bookmark, MonitorPlay, FileText, User, 
  MoreHorizontal, Feather, Bot, Settings, HelpCircle, LogOut,
  Target, Zap, Activity, Lightbulb, PlusCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: Sparkles, label: 'AI Feed', path: '/dashboard/ai-feed' },
  { icon: Hash, label: 'Explore', path: '/dashboard/explore' },
  { icon: Bell, label: 'Notifications', path: '/dashboard/notifications' },
  { icon: Users, label: 'Following', path: '/dashboard/following' },
  { icon: MessageSquare, label: 'Chat', path: '/dashboard/chat' },
  { icon: Bot, label: 'AI Assistant', path: '/dashboard/ai-assistant' },
  { icon: Star, label: 'Premium', path: '/dashboard/premium' },
  { icon: Bookmark, label: 'Bookmarks', path: '/dashboard/bookmarks' },
  { icon: MonitorPlay, label: 'Creator Studio', path: '/dashboard/creator-studio' },
  { icon: FileText, label: 'Articles', path: '/dashboard/articles' },
  { icon: User, label: 'Profile', path: '/dashboard/profile' },
];

const FEED_FILTERS = [
  { id: 'all', label: 'All Updates', icon: Activity },
  { id: 'system_drop', label: 'System Drops', icon: Target },
  { id: 'tool_drop', label: 'Tool Drops', icon: Zap },
  { id: 'update', label: 'Platform Updates', icon: Sparkles },
  { id: 'insight', label: 'Insights', icon: Lightbulb },
];

const AIFeedLeftSidebar = ({ currentFilter, onFilterChange }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'admin@starksglobal.com';

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen px-2 xl:px-6 py-4 fixed w-20 xl:w-[275px] items-center xl:items-start border-r border-white/10 overflow-y-auto hide-scrollbar z-40 bg-background">
      <NavLink 
        to="/dashboard" 
        end
        className="mb-4 xl:px-4 p-3 hover:bg-primary/10 rounded-full cursor-pointer transition-colors inline-block text-primary"
      >
        <Feather className="w-8 h-8 xl:w-9 xl:h-9 drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
      </NavLink>

      <nav className="flex-1 space-y-1 w-full xl:w-auto mt-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink 
              key={item.label} 
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) => `
                flex items-center gap-4 xl:px-4 p-3 rounded-full transition-all duration-200 w-max mx-auto xl:mx-0 group
                ${isActive 
                  ? 'font-bold text-foreground bg-primary/10' 
                  : 'font-medium text-foreground hover:bg-white/10 hover:text-primary'}
              `}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-7 h-7 transition-colors ${
                    isActive 
                      ? 'text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)]' 
                      : 'group-hover:text-primary'
                  }`} />
                  <span className={`hidden xl:block text-xl tracking-tight pr-4 transition-colors ${
                    isActive 
                      ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]' 
                      : ''
                  }`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-4 xl:px-4 p-3 rounded-full hover:bg-white/10 hover:text-primary transition-all duration-200 w-max mx-auto xl:mx-0 font-medium text-foreground group outline-none cursor-pointer">
              <MoreHorizontal className="w-7 h-7 group-hover:text-primary transition-colors" />
              <span className="hidden xl:block text-xl tracking-tight pr-4 group-hover:text-primary transition-colors">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            align="start" 
            className="w-56 bg-card border-white/10 text-foreground mb-2 shadow-[0_0_30px_hsl(var(--primary)/0.15)] rounded-xl overflow-hidden"
          >
            <DropdownMenuItem className="cursor-pointer hover:bg-white/5 py-3 focus:bg-white/10 focus:text-primary text-base font-medium">
              <Settings className="mr-3 w-5 h-5" /> Settings and privacy
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-white/5 py-3 focus:bg-white/10 focus:text-primary text-base font-medium">
              <HelpCircle className="mr-3 w-5 h-5" /> Help Center
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10 my-1" />
            <DropdownMenuItem 
              onClick={handleLogout} 
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 hover:bg-destructive/10 py-3 text-base font-medium"
            >
              <LogOut className="mr-3 w-5 h-5" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Feed Filters Section - Only visible if on AI Feed route logic handled via parent, but safe to show always here if preferred */}
        <div className="hidden xl:block mt-8 mb-4 pt-6 border-t border-white/10 w-full">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-4">Feed Filters</h3>
          <div className="space-y-1">
            {FEED_FILTERS.map(filter => {
              const FIcon = filter.icon;
              const isActive = currentFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => onFilterChange(filter.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
                    isActive ? 'bg-white/10 text-foreground font-bold' : 'text-muted-foreground font-medium hover:bg-white/5 hover:text-foreground'
                  }`}
                >
                  <FIcon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                  <span className="text-sm">{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {isAdmin && (
        <button 
          onClick={() => navigate('/admin/ai-feed-posts')}
          className="mt-6 bg-primary text-background font-bold text-lg rounded-full py-3.5 px-8 w-[90%] hidden xl:flex items-center justify-center gap-2 hover:bg-primary/90 transition-all duration-200 shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] active:scale-[0.98]"
        >
          <PlusCircle className="w-5 h-5" /> Create Post
        </button>
      )}
      {isAdmin && (
        <button 
          onClick={() => navigate('/admin/ai-feed-posts')}
          className="mt-6 bg-primary text-background font-bold rounded-full p-4 xl:hidden hover:bg-primary/90 transition-all duration-200 shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] active:scale-[0.95] mx-auto flex"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
      )}

      {/* Simple spacer at bottom since user profile was removed */}
      <div className="mt-auto h-8"></div>
    </div>
  );
};

export default AIFeedLeftSidebar;