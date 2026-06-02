import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PaginationControls = ({ currentPage, totalPages, onPageChange, className }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 w-full", className)}>
      <span className="text-sm font-medium text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:pointer-events-none transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 hidden sm:flex">
          {pages.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold transition-all",
                currentPage === page
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)] border border-primary"
                  : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:pointer-events-none transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;