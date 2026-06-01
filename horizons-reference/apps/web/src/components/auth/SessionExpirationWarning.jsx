import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const SessionExpirationWarning = () => {
  const { currentUser, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExtending, setIsExtending] = useState(false);

  const checkExpiration = useCallback(() => {
    if (!currentUser || !pb.authStore.isValid || !pb.authStore.token) {
      setIsOpen(false);
      return;
    }

    try {
      const token = pb.authStore.token;
      const payloadBase64 = token.split('.')[1];
      const decodedJson = atob(payloadBase64);
      const payload = JSON.parse(decodedJson);
      
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const remainingMs = expirationTime - currentTime;

      // If less than 5 minutes (300,000 ms) remaining
      if (remainingMs > 0 && remainingMs <= 300000) {
        setTimeLeft(Math.floor(remainingMs / 1000));
        setIsOpen(true);
      } else if (remainingMs <= 0) {
        setIsOpen(false);
        logout();
        toast.error('Session expired. Please log in again.');
      } else {
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to parse token for expiration warning:', error);
    }
  }, [currentUser, logout]);

  useEffect(() => {
    checkExpiration();
    const intervalId = setInterval(checkExpiration, 10000); // Check every 10 seconds
    return () => clearInterval(intervalId);
  }, [checkExpiration]);

  // Countdown timer effect when dialog is open
  useEffect(() => {
    let timerId;
    if (isOpen && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsOpen(false);
            logout();
            toast.error('Session expired due to inactivity.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isOpen, timeLeft, logout]);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      await pb.collection('users').authRefresh({ $autoCancel: false });
      setIsOpen(false);
      toast.success('Session extended successfully.');
    } catch (error) {
      console.error('Failed to extend session:', error);
      toast.error('Failed to extend session. Please log in again.');
      logout();
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <Clock className="w-5 h-5" /> Session Expiring Soon
          </DialogTitle>
          <DialogDescription className="pt-3 text-base">
            Your security session will expire in <strong className="text-foreground font-mono">{formatTime(timeLeft)}</strong> due to inactivity. 
            Would you like to extend your session?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
            <LogOut className="w-4 h-4 mr-2" /> Logout Now
          </Button>
          <Button onClick={handleExtendSession} disabled={isExtending} className="w-full sm:w-auto">
            {isExtending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Clock className="w-4 h-4 mr-2" />
            )}
            Extend Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionExpirationWarning;