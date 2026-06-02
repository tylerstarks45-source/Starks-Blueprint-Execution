import React from 'react';
import ProductCard from './ProductCard.jsx';
import { Zap } from 'lucide-react';

const FeaturedProducts = ({ products }) => {
  if (!products || products.length === 0) return null;

  return (
    <div className="mb-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Top Systems This Week</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map(product => (
          <ProductCard key={product.id} product={product} isFeatured={true} />
        ))}
      </div>
    </div>
  );
};

export default FeaturedProducts;