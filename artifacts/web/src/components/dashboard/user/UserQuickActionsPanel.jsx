import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Layers, Key, Globe, Link2, Mail, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const linkActions = [
  { to: '/landing-pages', icon: Globe, label: 'Pages', accent: 'text-violet-400' },
  { to: '/affiliate-links', icon: Link2, label: 'Affiliate Links', accent: 'text-emerald-400' },
  { to: '/email-marketing', icon: Mail, label: 'Email', accent: 'text-sky-400' },
  { to: '/how-it-works', icon: BookOpen, label: 'How It Works', accent: 'text-white/40' },
  { to: '/blueprints', icon: Layers, label: 'Blueprints', accent: 'text-white/40' },
  { to: '/my-stack', icon: Key, label: 'My Stack', accent: 'text-white/40' },
];

const UserQuickActionsPanel = () => {
  const navigate = useNavigate();
  const { resetOnboarding } = useAuth();

  const handleSetupWizard = async () => {
    await resetOnboarding();
    navigate('/dashboard');
  };

  return (
    <Card className="border-white/10 bg-black/80 backdrop-blur-sm shadow-xl">
      <CardContent className="p-4 grid grid-cols-3 gap-3">
        {linkActions.map(({ to, icon: Icon, label, accent }) => (
          <Button key={to} variant="outline" className="h-auto py-3 flex flex-col gap-2 bg-muted/10 hover:bg-white/5 transition-colors" asChild>
            <Link to={to}>
              <Icon className={`w-5 h-5 ${accent}`} />
              <span className="text-xs">{label}</span>
            </Link>
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={handleSetupWizard}
          className="h-auto py-3 flex flex-col gap-2 bg-primary/8 border-primary/20 hover:bg-primary/15 transition-colors"
        >
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-xs text-primary/80">Setup Wizard</span>
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserQuickActionsPanel;
