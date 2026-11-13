
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Star, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const getBadgeStyles = (badge) => {
  const b = badge.toLowerCase();
  if (b.includes('popular')) return 'badge-popular';
  if (b.includes('value')) return 'badge-best-value';
  if (b.includes('new')) return 'badge-new';
  if (b.includes('premium')) return 'badge-premium';
  if (b.includes('trending')) return 'badge-trending';
  if (b.includes('limited')) return 'badge-limited';
  return 'badge-verified';
};

const ProductCard = ({ product }) => {
  if (!product) return null;

  // Mock pricing if not available
  const price = product.price || (product.badges?.includes('💎 Premium') ? '$99/mo' : 'Free Trial');
  const rating = product.social_proof?.[0]?.split('/')[0];
  const users = product.social_proof?.[1];

  return (
    <div className="cinematic-card flex flex-col h-full group">
      {/* Top Image Section */}
      <div className="relative h-48 overflow-hidden bg-muted border-b border-border/50">
        <img 
          src={product.image || "https://images.unsplash.com/photo-1684369176170-463e84248b70?auto=format&fit=crop&w=800&q=80"} 
          alt={product.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        
        {/* Category Tag */}
        <div className="absolute top-4 left-4">
          <Badge variant="secondary" className="bg-background/95 backdrop-blur-md text-foreground border-border/50 shadow-sm">
            {product.category}
          </Badge>
        </div>

        {/* Urgency/Trust Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          {product.badges?.map((badge, idx) => (
            <Badge key={idx} variant="outline" className={cn("shadow-sm backdrop-blur-md bg-background/80", getBadgeStyles(badge))}>
              {badge}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Card Content Body */}
      <div className="p-6 flex flex-col flex-grow z-10">
        
        {/* Header: Title + Pricing */}
        <div className="flex justify-between items-start mb-2 gap-4">
          <h3 className="text-xl font-bold text-foreground leading-tight line-clamp-2">{product.name}</h3>
          <div className="text-right shrink-0">
            <span className="text-lg font-bold text-primary">{price}</span>
          </div>
        </div>

        {/* Rating & Trust */}
        <div className="flex items-center gap-3 mb-4 text-sm">
          {rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span className="font-bold text-foreground">{rating}</span>
            </div>
          )}
          {rating && users && <span className="text-muted-foreground">•</span>}
          {users && <span className="text-muted-foreground">{users}</span>}
          {product.badges?.includes('✅ Verified') && (
            <>
              <span className="text-muted-foreground">•</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </>
          )}
        </div>

        {/* Value Proposition / Description */}
        <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-5 line-clamp-2">
          {product.description}
        </p>

        {/* Key Features */}
        <div className="mb-6 space-y-2.5 flex-grow">
          {product.features?.slice(0, 3).map((feature, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-foreground/90 line-clamp-1">{feature}</span>
            </div>
          ))}
        </div>
        
        {/* Footer Area: CTAs */}
        <div className="mt-auto pt-5 border-t border-border/50 flex flex-col gap-3">
          <Button asChild className="w-full group/btn" size="lg">
            <a href={product.cta_link} target="_blank" rel="noopener noreferrer">
              {product.customCTA || "Get Access"}
              <Zap className="w-4 h-4 ml-2 group-hover/btn:scale-110 transition-transform" />
            </a>
          </Button>
          <Button asChild variant="ghost" className="w-full group/link">
            <Link to={`/marketplace/product/${product.id}`}>
              View Full Details
              <ArrowRight className="w-4 h-4 ml-2 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
