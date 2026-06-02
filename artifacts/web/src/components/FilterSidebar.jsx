import React from 'react';
import { Filter, Check, X, Target, BrainCircuit, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    id: "category",
    title: "Category",
    icon: Wrench,
    options: [
      "AI Video Tools", 
      "AI Marketing Tools", 
      "AI Automation Tools", 
      "AI Writing Tools", 
      "AI Business Systems", 
      "AI Sales Tools", 
      "AI Chatbots", 
      "AI Data Tools", 
      "Funnel & Email Tools", 
      "Website Builders", 
      "Analytics Tools"
    ]
  },
  {
    id: "useCase",
    title: "Use Case",
    icon: Target,
    options: [
      "Task Automation", "Lead Generation", "Video Scripts", "Faceless Videos", 
      "Customer Support", "Mobile Lead Gen", "Product Creation", "Sales Funnels", 
      "Tag-based Email", "Web Scraping", "Market Analysis", "Keyword Tracking", 
      "Course Hosting", "Business Strategy", "Data Cleaning", "Book Writing", 
      "Trade Copying", "Team Management", "Customer Engagement", "Email Marketing", 
      "Ad Creatives", "App Integration", "Web Apps", "Social Posts", "Video Ads", 
      "Team Workflows", "Rank Tracking", "Blog Posts", "API Integration", "Newsletters", "SEO"
    ]
  },
  {
    id: "systemType",
    title: "System Type",
    icon: BrainCircuit,
    options: [
      "Content Traffic Sales", "Agency Operations", "AI Agency System", 
      "Sales Automation", "Social Growth System", "Affiliate Machine", 
      "Customer Service Automation", "Lead Gen System", "Product Launch System", 
      "Course Creator System", "AI Funnel Email", "Research Automation", 
      "Trading Automation", "Data Intelligence System", "Publishing System"
    ]
  }
];

const FilterSidebar = ({ 
  selectedCategory, 
  selectedUseCase, 
  selectedSystemType, 
  onFilterChange, 
  isMobileOpen, 
  setIsMobileOpen, 
  onClearFilters 
}) => {
  
  const getSelectedValueForSection = (sectionId) => {
    switch (sectionId) {
      case 'category': return selectedCategory;
      case 'useCase': return selectedUseCase;
      case 'systemType': return selectedSystemType;
      default: return null;
    }
  };

  const renderFilterGroup = (section) => {
    const Icon = section.icon;
    const selectedValue = getSelectedValueForSection(section.id);

    return (
      <div className="mb-8">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-border/50">
          <Icon className="w-4 h-4 text-primary" /> {section.title}
        </h3>
        <div className="space-y-3">
          {section.options.map(option => {
            const isSelected = selectedValue === option;

            return (
              <label key={option} className="flex items-center group cursor-pointer">
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 mr-3 shrink-0",
                  isSelected 
                    ? "bg-primary border-primary shadow-[0_0_10px_hsl(var(--primary)/0.4)]" 
                    : "border-border group-hover:border-primary/50 bg-secondary/50"
                )}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
                <span className={cn(
                  "text-sm transition-colors duration-200 leading-snug",
                  isSelected ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground font-medium"
                )}>
                  {option}
                </span>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={isSelected} 
                  onChange={() => onFilterChange(section.id, option)} 
                />
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const hasActiveFilters = selectedCategory !== null || selectedUseCase !== null || selectedSystemType !== null;

  return (
    <aside className={cn(
      "w-full lg:w-72 shrink-0 transition-all duration-300",
      isMobileOpen ? "block" : "hidden lg:block"
    )}>
      <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl sticky top-24">
        {/* Mobile Header */}
        <div className="flex items-center justify-between mb-8 lg:hidden pb-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" /> Filters
          </h2>
          <button onClick={() => setIsMobileOpen(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Clear Filters (Desktop) */}
        <div className="hidden lg:flex items-center justify-between mb-6 pb-4 border-b border-border/50">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" /> Filter Tools
          </h2>
          {hasActiveFilters && (
            <button 
              onClick={onClearFilters}
              className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Mobile Clear Button */}
        {hasActiveFilters && (
          <div className="lg:hidden mb-6">
            <button 
              onClick={onClearFilters}
              className="w-full py-2 text-sm text-primary hover:bg-primary/10 rounded-lg font-semibold transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar pr-2">
          {SECTIONS.map((section) => (
            <React.Fragment key={section.id}>
              {renderFilterGroup(section)}
            </React.Fragment>
          ))}
        </div>
        
        {/* Mobile Apply Button */}
        <div className="lg:hidden mt-6 pt-4 border-t border-border">
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="saas-button w-full"
          >
            Show Results
          </button>
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;