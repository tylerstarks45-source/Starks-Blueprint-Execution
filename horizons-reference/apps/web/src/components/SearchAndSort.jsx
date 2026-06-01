import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SearchAndSort = ({ 
  searchTerm, 
  onSearchChange, 
  sortBy, 
  onSortChange, 
  activeFilterCount, 
  onMobileFilterToggle,
  onClearFilters,
  filters
}) => {
  return (
    <div className="w-full mb-8">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card border border-border p-3 sm:p-4 rounded-xl shadow-sm">
        {/* Search Input */}
        <div className="relative w-full md:w-[400px] lg:w-[500px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="Search AI tools, systems, or software…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-lg pl-12 pr-4 py-3 text-foreground text-[1rem] transition-all duration-300 placeholder:text-muted-foreground"
          />
          {searchTerm && (
            <button 
              onClick={() => onSearchChange("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <Button 
            variant="outline" 
            className="lg:hidden border-border bg-secondary/50 text-foreground rounded-lg hover:border-primary/40 hover:text-primary transition-colors"
            onClick={onMobileFilterToggle}
          >
            <Filter className="w-4 h-4 mr-2" /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-[0.75rem] text-muted-foreground hidden sm:inline-block font-mono uppercase tracking-wider">Sort_By:</span>
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="bg-secondary/50 border border-border focus:border-primary/50 rounded-lg py-2.5 px-4 text-[0.875rem] text-foreground appearance-none pr-10 transition-all duration-300 cursor-pointer outline-none"
              >
                <option value="Newest">Newest First</option>
                <option value="Recommended">Recommended</option>
                <option value="Popular">Popularity</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center mt-4 px-2">
          <span className="text-[0.7rem] text-muted-foreground mr-2 font-mono uppercase tracking-wider">Active_Filters:</span>
          {Object.entries(filters).map(([type, values]) => 
            values.map(val => (
              <span key={`${type}-${val}`} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[0.75rem] font-medium">
                {val}
                <button 
                  onClick={() => onClearFilters(type, val)} 
                  className="hover:text-primary-foreground hover:bg-primary/80 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${val} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
          <button 
            onClick={() => onClearFilters('ALL')} 
            className="text-[0.75rem] text-muted-foreground hover:text-primary ml-2 underline font-mono transition-colors"
          >
            CLEAR_ALL
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchAndSort;