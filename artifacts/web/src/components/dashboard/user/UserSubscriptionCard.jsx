import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const TIER_CONFIG = {
  starter: {
    label: 'Starter',
    badge: 'bg-muted/30 text-muted-foreground border-border/30',
    features: ['Access to all blueprints', 'Marketplace access', 'Affiliate tool links'],
    locked: ['AI Build Agent', 'System automation'],
  },
  builder: {
    label: 'Builder',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    features: ['AI Build Agent (5/mo)', '50,000 tokens/mo', '5 active systems', 'Email support'],
    locked: ['Unlimited builds'],
  },
  operator: {
    label: 'Operator',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    features: ['Unlimited AI builds', '200,000 tokens/mo', '15 active systems', 'Priority support'],
    locked: [],
  },
  empire: {
    label: 'Empire',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    features: ['Everything unlimited', '1M tokens/mo', 'Dedicated support', 'API access'],
    locked: [],
  },
};

const UserSubscriptionCard = () => {
  const { currentUser } = useAuth();
  const tier = (currentUser?.membershipTier || 'starter').toLowerCase();
  const config = TIER_CONFIG[tier] || TIER_CONFIG.starter;
  const isTopTier = tier === 'empire';

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Crown className="w-5 h-5 text-blue-500" /> Subscription
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
            <li key={`l${i}`} className="flex items-center text-sm text-muted-foreground/40 line-through">
              <X className="w-4 h-4 text-muted-foreground/30 mr-2 shrink-0" />
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
