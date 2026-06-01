import React from 'react';

const CategoryFilter = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar w-full">
      <button
        onClick={() => onSelectCategory('All')}
        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
          selectedCategory === 'All'
            ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)]'
            : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
        }`}
      >
        All Updates
      </button>
      
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
            selectedCategory === category
              ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)]'
              : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;