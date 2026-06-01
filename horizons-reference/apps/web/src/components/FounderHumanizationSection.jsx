import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

const FounderHumanizationSection = () => {
  return (
    <section className="py-32 bg-background relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center">
          
          {/* Image Side */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative lg:col-span-5"
          >
            <div className="relative rounded-2xl overflow-hidden founder-image-container bg-card">
              <img 
                src="https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/2fd67c28d556ddce69c48d409537272b.jpg" 
                alt="Tyler Starks" 
                className="w-full h-auto object-cover aspect-[4/5] md:aspect-[3/4] opacity-90 hover:opacity-100 transition-opacity duration-500"
              />
              
              {/* Premium Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90"></div>
              
              {/* Founder Info Plate */}
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-3xl text-foreground tracking-tight">Tyler Starks</h3>
                  <p className="text-primary font-medium tracking-wide text-sm uppercase">Founder, Starks Global Group</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Text Side */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col justify-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 w-fit shadow-[0_0_15px_rgba(0,212,255,0.1)]">
              <ShieldCheck className="w-4 h-4" /> 
              <span className="tracking-wide uppercase text-xs">Our Mission</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-10 leading-[1.1] tracking-tight text-balance">
              Building systems, <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">not just software.</span>
            </h2>
            
            <div className="space-y-6 text-lg md:text-xl text-muted-foreground premium-text-body">
              <p>
                This platform was created with a clear mission: to cut through the noise and provide actionable, proven systems for everyday builders. When I first started exploring automation, I wasted thousands of dollars and countless hours on fragmented tools and overly complex tutorials.
              </p>
              <p>
                I realized that the barrier to entry wasn't the technology itself, but the lack of clear, step-by-step execution plans. We built Starks Global Group to solve that exact problem.
              </p>
              <p>
                We strip away the hype, the jargon, and the unnecessary complexity, leaving only what actually works. AI is not magic. It can be learned, applied, and used by anyone willing to take the time to understand it.
              </p>
            </div>

            <div className="mt-12 pt-10 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <img 
                    key={i}
                    src={`https://i.pravatar.cc/100?img=${i + 10}`} 
                    alt="Community Member" 
                    className="w-12 h-12 rounded-full border-2 border-background shadow-sm"
                  />
                ))}
              </div>
              <div className="text-base font-medium text-foreground/90">
                Join <span className="text-primary font-bold">1,200+</span> builders <br className="hidden sm:block"/>executing these systems today.
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default FounderHumanizationSection;