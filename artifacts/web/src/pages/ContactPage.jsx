
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, MessageSquare, Wrench, HeartHandshake as Handshake, ArrowRight, Building2, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VideoBackground from '@/components/VideoBackground.jsx';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubjectChange = (value) => {
    setFormData(prev => ({ ...prev, subject: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message.');
      toast.success("Inquiry submitted successfully! Typical response time: 24–48 hours.");
      setFormData({ fullName: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VideoBackground>
      <Helmet>
        <title>Contact Us | Starks Global Group</title>
        <meta name="description" content="Contact Starks Global Group for questions about AI tools, automation systems, and platform recommendations." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow">
        
        <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-24 overflow-hidden border-b border-white/10 bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-4xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-primary/30 bg-primary/20 backdrop-blur-md text-primary text-xs font-mono uppercase tracking-widest rounded-md">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Support & Inquiries</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-tight tracking-tight mb-6 text-shadow-lg">
                Contact Starks Global Group
              </h1>
              <p className="text-lg md:text-xl text-zinc-100 leading-relaxed max-w-3xl mx-auto text-shadow-sm font-medium">
                We're here to help you navigate AI tools, automation systems, and platform recommendations. Whether you have questions, need guidance, or want support—we respond directly.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 bg-background/40 backdrop-blur-md relative border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 border border-white/10 bg-card/80 backdrop-blur-xl rounded-xl hover:border-primary/30 transition-colors shadow-lg">
                <Mail className="w-8 h-8 text-primary mb-6" />
                <h3 className="text-xl font-bold text-foreground mb-3 text-shadow-sm">General Inquiries</h3>
                <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-medium">
                  For questions about AI tools, platform usage, and system recommendations.
                </p>
                <div className="text-primary font-mono text-sm font-bold">contact@starksglobalgroup.net</div>
              </div>

              <div className="p-8 border border-white/10 bg-card/80 backdrop-blur-xl rounded-xl hover:border-blue-400/30 transition-colors shadow-lg">
                <Wrench className="w-8 h-8 text-blue-400 mb-6" />
                <h3 className="text-xl font-bold text-foreground mb-3 text-shadow-sm">Platform & Technical</h3>
                <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-medium">
                  For account issues, access problems, and platform bug reports.
                </p>
                <div className="flex items-center gap-2 text-blue-400 font-mono text-sm font-bold">
                  <Clock className="w-4 h-4" /> Typical response: 24–48 hours
                </div>
              </div>

              <div className="p-8 border border-white/10 bg-card/80 backdrop-blur-xl rounded-xl hover:border-blue-600/30 transition-colors shadow-lg">
                <Handshake className="w-8 h-8 text-blue-500 mb-6" />
                <h3 className="text-xl font-bold text-foreground mb-3 text-shadow-sm">Business & Partnerships</h3>
                <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-medium">
                  For: Affiliate partnerships, Software listings, Collaboration opportunities.
                </p>
                <div className="text-blue-500 font-mono text-sm font-bold">partnerships@starksglobalgroup.net</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background/60 backdrop-blur-lg relative border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
              
              <div className="lg:col-span-7">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2 text-shadow-md">Send a Message</h2>
                  <p className="text-zinc-200 text-shadow-sm font-medium">Fill out the form below and our team will get back to you.</p>
                </div>

                <div className="bg-card/90 backdrop-blur-2xl p-8 border border-white/10 rounded-2xl shadow-2xl">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-foreground text-shadow-sm">Full Name <span className="text-primary">*</span></Label>
                        <Input 
                          id="fullName" name="fullName" value={formData.fullName} onChange={handleChange}
                          placeholder="John Doe" required 
                          className="bg-background/80 border-white/20 text-foreground focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-foreground text-shadow-sm">Email Address <span className="text-primary">*</span></Label>
                        <Input 
                          id="email" name="email" type="email" value={formData.email} onChange={handleChange}
                          placeholder="john@example.com" required 
                          className="bg-background/80 border-white/20 text-foreground focus-visible:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 z-50">
                      <Label htmlFor="subject" className="text-foreground text-shadow-sm">Subject <span className="text-primary">*</span></Label>
                      <Select value={formData.subject} onValueChange={handleSubjectChange} required>
                        <SelectTrigger className="bg-background/80 border-white/20 text-foreground">
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-[100] border-white/20">
                          <SelectItem value="General Question">General Question</SelectItem>
                          <SelectItem value="Tool Recommendation">Tool Recommendation</SelectItem>
                          <SelectItem value="Technical Issue">Technical Issue</SelectItem>
                          <SelectItem value="Partnership Inquiry">Partnership Inquiry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-foreground text-shadow-sm">Message <span className="text-primary">*</span></Label>
                      <Textarea 
                        id="message" name="message" value={formData.message} onChange={handleChange}
                        placeholder="How can we help you?" required 
                        className="min-h-[150px] bg-background/80 border-white/20 text-foreground focus-visible:ring-primary resize-y"
                      />
                    </div>

                    <div className="pt-2">
                      <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 font-bold tracking-wide shadow-lg">
                        {isSubmitting ? 'Sending...' : 'Submit Inquiry'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-8">
                <div className="p-8 border border-white/10 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-bold text-foreground text-shadow-sm">Direct Operator Access</h3>
                  </div>
                  <p className="text-zinc-300 leading-relaxed text-sm font-medium">
                    Starks Global Group is operated by a real team, not an anonymous platform. All inquiries are reviewed directly, and we maintain strict standards for communication, support, and platform accountability.
                  </p>
                </div>

                <div className="p-8 border border-white/10 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-bold text-foreground text-shadow-sm">Company Information</h3>
                  </div>
                  <ul className="space-y-4 text-sm font-medium">
                    <li className="flex flex-col">
                      <span className="text-primary/80 font-mono text-xs uppercase tracking-wider mb-1 text-shadow-sm">Platform Type</span>
                      <span className="text-foreground">AI Software Marketplace & System Blueprint Platform</span>
                    </li>
                    <li className="flex flex-col">
                      <span className="text-primary/80 font-mono text-xs uppercase tracking-wider mb-1 text-shadow-sm">Business Model</span>
                      <span className="text-foreground">Affiliate-supported infrastructure platform</span>
                    </li>
                    <li className="flex flex-col">
                      <span className="text-primary/80 font-mono text-xs uppercase tracking-wider mb-1 text-shadow-sm">Location</span>
                      <span className="text-foreground">United States</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
      
      <Footer />
    </VideoBackground>
  );
};

export default ContactPage;
