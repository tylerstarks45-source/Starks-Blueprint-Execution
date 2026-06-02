import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Youtube, Linkedin } from 'lucide-react';

const Footer = () => {
  // Rendered on ALL pages as requested. Removed the path checks.
  return (
    <footer className="bg-background border-t border-border py-16 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="mb-8">
              <Link to="/">
                <img 
                  src="https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/4c35c9e2294c3d0e16fb5ed3a74c5ddc.png" 
                  alt="Starks Global Group" 
                  className="h-12 w-auto object-contain hover:opacity-90 transition-opacity" 
                />
              </Link>
            </div>
            <p className="text-base text-muted-foreground max-w-md leading-relaxed mb-6 font-medium">
              Automation infrastructure platform for modern businesses. We test, validate, and structure AI tools into deployable systems.
            </p>
            
            <div className="space-y-3">
              <a href="mailto:contact@starksglobalgroup.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                <Mail className="w-4 h-4" /> contact@starksglobalgroup.com
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <MapPin className="w-4 h-4" /> 101 Primm Rd, Many, Louisiana
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <Phone className="w-4 h-4" /> 318-315-2305
              </div>
            </div>

            <div className="flex items-center gap-5 mt-8">
              <a href="https://www.youtube.com/channel/UCvORp1xlqaqwFsLOXvV_5Tw" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="YouTube">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="https://www.linkedin.com/in/tyler-starks-1660573a2" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="mailto:ceo@starksglobalgroup.com" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Email CEO">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-3">
              <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link></li>
              <li><Link to="/blueprints" className="text-sm text-muted-foreground hover:text-primary transition-colors">System Blueprints</Link></li>
              <li><Link to="/marketplace" className="text-sm text-muted-foreground hover:text-primary transition-colors">Marketplace</Link></li>
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Support</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Legal & Compliance</h4>
            <ul className="space-y-3">
              <li><Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-and-conditions" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/affiliate-disclosure" className="text-sm text-muted-foreground hover:text-primary transition-colors">Affiliate Disclosure</Link></li>
              <li><Link to="/earnings-disclaimer" className="text-sm text-muted-foreground hover:text-primary transition-colors">Earnings Disclaimer</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground font-medium">
            © 2026 Starks Global Group. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-primary/80 uppercase tracking-widest">System Status: Operational</span>
            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse"></div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;