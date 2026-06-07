import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, X, Zap, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const TIER_CONFIG = {
  free: {
    label: 'Free',
    icon: Gift,
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    features: ['100 AI credits/month', '1 active system', '1 hosted system', 'Blueprint library access', 'Marketplace access', '3 integrations'],
    locked: ['Monthly renewal', 'Multiple systems', 'Revenue tracking'],
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    features: ['2,500 AI credits/month', 'Up to 25 active systems', '10 hosted systems', 'Advanced analytics', 'Revenue tracking', 'Priority build queue', '25 integrations'],
    locked: ['Unlimited systems', 'API access', 'White label'],
  },
  empire: {
    label: 'Empire',
    icon: Crown,
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    features: ['10,000 AI credits/month', 'Unlimited systems & hosting', 'Full STARKS AI Agent', 'Team features', 'White-label ready', 'API access', 'Priority support'],
    locked: [],
  },
  // legacy aliases — display as their canonical equivalents
  starter: {
    label: 'Pro',
    icon: Zap,
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    features: ['2,500 AI credits/month', 'Up to 25 active systems', 'Advanced analytics', 'Revenue tracking'],
    locked: [],
  },
  builder: {
    label: 'Pro',
    icon: Zap,
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    features: ['2,500 AI credits/month', 'Up to 25 active systems', 'Advanced analytics', 'Revenue tracking'],
    locked: [],
  },
  operator: {
    label: 'Empire',
    icon: Crown,
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    features: ['10,000 AI credits/month', 'Unlimited systems', 'Priority support', 'API access'],
    locked: [],
  },
};

const UserSubscriptionCard = () => {
  const { currentUser } = useAuth();
  const tier = (currentUser?.membershipTier || 'free').toLowerCase();
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const isTopTier = tier === 'empire' || tier === 'operator';
  const Icon = config.icon;

  return (
    <Card className="h-full flex flex-col border-white/10 bg-black/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-500" /> Subscription
          </CardTitle>
          <Badge variant="outline" className={config.badge}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-4">
        <ul className="space-y-2.5 mb-4 flex-1">
          {config.features.map((feature, i) => (
            <li key={i} className="flex items-center text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
              {feature}
            </li>
          ))}
          {config.locked.map((feature, i) => (
            <li key={`l${i}`} className="flex items-center text-sm text-muted-foreground/35 line-through">
              <X className="w-4 h-4 text-muted-foreground/25 mr-2 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
        {!isTopTier && (
          <div className="pt-4 border-t border-border/40 mt-auto">
            <Button className="w-full bg-foreground text-background hover:bg-foreground/90" asChild>
              <Link to="/pricing">Upgrade Plan</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserSubscriptionCard;
