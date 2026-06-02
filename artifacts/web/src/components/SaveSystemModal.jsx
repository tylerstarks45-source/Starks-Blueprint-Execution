import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BookmarkPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const SaveSystemModal = ({ isOpen, onOpenChange, blueprintId, defaultSystemName }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    systemName: defaultSystemName || '',
    savedTo: 'Saved Systems',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!currentUser) {
      toast.error("Please log in to save systems.");
      navigate('/login');
      return;
    }

    if (!blueprintId) {
      toast.error("Error: Blueprint ID missing.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if already saved
      const existing = await pb.collection('saved_systems').getList(1, 1, {
        filter: `userId="${currentUser.id}" && blueprintId="${blueprintId}"`,
        $autoCancel: false
      });
      
      if (existing.items.length > 0) {
        toast.info("This system is already saved to your dashboard!");
        onOpenChange(false);
        setIsSubmitting(false);
        return;
      }

      await pb.collection('saved_systems').create({
        userId: currentUser.id,
        blueprintId: blueprintId,
        systemName: formData.systemName,
        savedTo: formData.savedTo,
        notes: formData.notes,
        status: 'Not Started',
        progress: 0
      }, { $autoCancel: false });

      toast.success("System saved successfully!");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save system. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookmarkPlus className="w-5 h-5 text-primary" /> Save System
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Save this blueprint to your dashboard to track your implementation progress.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="systemName">Custom Name (Optional)</Label>
            <input
              id="systemName"
              name="systemName"
              value={formData.systemName}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
              placeholder="e.g. My Q3 Sales Funnel"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="savedTo">Save Location</Label>
            <select
              id="savedTo"
              name="savedTo"
              value={formData.savedTo}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground"
            >
              <option value="Dashboard">Dashboard</option>
              <option value="My Stack">My Stack</option>
              <option value="Saved Systems">Saved Systems</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground"
              placeholder="Add any initial thoughts or customization ideas..."
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="border-border text-foreground hover:bg-muted">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save to Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveSystemModal;