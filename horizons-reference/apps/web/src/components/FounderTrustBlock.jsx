import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const FounderTrustBlock = ({ imageUrl }) => {
  return (
    <section className="py-20 md:py-24 bg-gradient-dark relative overflow-hidden border-b border-white/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Image Column (40-45%) */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-[0_0_50px_hsl(var(--neon-blue)/0.4)] border border-primary/30 aspect-[4/5] sm:aspect-square lg:aspect-[4/5] hover-glow">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-10" />
              <img 
                src={imageUrl} 
                alt="Tyler Starks - Founder" 
                className="w-full h-full object-cover object-center relative z-0"
              />
            </div>
            {/* Soft background glow */}
            <div className="absolute -inset-6 bg-primary/20 blur-[60px] -z-10 rounded-full" />
          </motion.div>

          {/* Text Column (55-60%) */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-7 flex flex-col justify-center"
          >
            <span className="text-sm font-semibold text-primary uppercase tracking-widest mb-4 block">
              Why This Platform Exists
            </span>
            
            <h2 className="text-3xl md:text-4xl lg:text-[40px] font-extrabold text-white mb-8 text-balance leading-tight">
              Starks Global Group — Our Purpose
            </h2>
            
            <div className="space-y-6 text-[17px] md:text-lg text-zinc-300 font-medium leading-[1.7]">
              <p>
                Tyler Starks is the founder of Starks Global Group, an automation infrastructure platform built to help people understand and apply artificial intelligence in a practical, real-world way.
              </p>

              <div>
                <p className="font-semibold text-white mb-2">This platform was created with a clear mission:</p>
                <p className="text-primary font-bold">
                  To remove the confusion and fear surrounding AI—and replace it with clarity, structure, and opportunity.
                </p>
              </div>

              <p>
                There is a growing concern that artificial intelligence will replace jobs and make it harder for people to succeed. Instead of working against that shift, Tyler has focused on building systems that allow people to use AI as a tool—one that can support them, grow with them, and create new income opportunities.
              </p>

              <p className="font-semibold text-white">
                Starks Global Group is not designed only for advanced users or large companies. It is built for everyone.
              </p>

              <div>
                <p className="font-semibold text-white mb-2">Whether someone has experience or is starting from zero, the goal is the same:</p>
                <p className="text-primary font-bold">
                  To provide structured systems that make AI understandable, accessible, and usable.
                </p>
              </div>

              <p>
                Tyler and his team research, test, and build automation systems daily using real AI software tools. These systems are not theoretical—they are implemented, refined, and continuously improved before being shared on the platform.
              </p>

              <p>
                New tools and automation systems are consistently evaluated and added, giving users access to updated, real-world solutions without needing to figure everything out alone.
              </p>

              <p>
                Each blueprint is designed to save time, reduce trial and error, and eliminate unnecessary costs by providing systems that have already been built and tested.
              </p>

              <div>
                <p className="font-semibold text-white mb-2">The long-term vision is simple:</p>
                <p className="text-primary font-bold">
                  To help people stop seeing AI as something that works against them—and start using it as something that works for them.
                </p>
              </div>

              <p>
                This platform exists to show that AI is not limited to experts. It can be learned, applied, and used by anyone willing to take the time to understand it.
              </p>

              <div className="pt-4 border-t border-white/10 mt-8">
                <p className="font-semibold text-white mb-3">For direct inquiries, Tyler can be reached at:</p>
                <p className="mb-6">
                  <a href="mailto:ceo@starksglobalgroup.net" className="text-primary hover:text-primary/80 transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary font-bold">
                    ceo@starksglobalgroup.net
                  </a>
                </p>
                <p className="font-bold text-white text-xl mb-8">
                  Built on real systems. Designed for real people.
                </p>
                
                <Link to="/blueprints" className="saas-button text-lg px-8 py-4 shadow-[0_0_25px_hsl(var(--neon-blue)/0.4)]">
                  Explore Proven Systems <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};

export default FounderTrustBlock;