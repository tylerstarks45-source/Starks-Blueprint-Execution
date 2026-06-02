import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Trophy } from 'lucide-react';

const InteractiveChecklist = ({ items, systemId }) => {
  // Initialize state from localStorage if available, otherwise array of false
  const [checkedState, setCheckedState] = useState(() => {
    const saved = localStorage.getItem(`checklist_${systemId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return Array(items.length).fill(false); }
    }
    return Array(items.length).fill(false);
  });

  useEffect(() => {
    localStorage.setItem(`checklist_${systemId}`, JSON.stringify(checkedState));
  }, [checkedState, systemId]);

  const handleCheck = (index) => {
    const newState = [...checkedState];
    newState[index] = !newState[index];
    setCheckedState(newState);
  };

  const completedCount = checkedState.filter(Boolean).length;
  const progressPercent = Math.round((completedCount / items.length) * 100) || 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Launch Checklist</h3>
          <p className="text-sm text-muted-foreground mt-1">Track your progress to deployment.</p>
        </div>
        <div className="flex items-center gap-4 bg-background px-4 py-2 rounded-lg border border-border">
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
            <span className="text-xs text-muted-foreground block">Complete</span>
          </div>
          <Trophy className={`w-8 h-8 ${progressPercent === 100 ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-zinc-600'}`} />
        </div>
      </div>

      <Progress value={progressPercent} className="h-2 mb-8 bg-zinc-800" indicatorColor="bg-primary" />

      <div className="space-y-3">
        {items.map((item, index) => (
          <label 
            key={index} 
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none
              ${checkedState[index] 
                ? 'bg-[hsl(var(--checklist-complete)/0.1)] border-[hsl(var(--checklist-complete)/0.3)]' 
                : 'bg-background hover:bg-white/5 border-border'
              }`}
          >
            <Checkbox 
              checked={checkedState[index]} 
              onCheckedChange={() => handleCheck(index)}
              className={checkedState[index] ? "data-[state=checked]:bg-[hsl(var(--checklist-complete))] data-[state=checked]:text-black border-transparent" : ""}
            />
            <span className={`text-base font-medium transition-colors ${checkedState[index] ? 'text-zinc-300 line-through decoration-zinc-500' : 'text-foreground'}`}>
              {item}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default InteractiveChecklist;