import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const FounderSection = () => {
  return (
    <section className="mb-32">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-start">
        
        {/* Left Column: Image & Label */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col relative group"
        >
          <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 rounded-3xl pointer-events-none" />
          <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-2xl">
            <img 
              src="https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/cf5fe10940e34f7e6fc037fef430d788.png" 
              alt="Tyler Starks in a dark navy sweater with light blue collared shirt in a modern office setting" 
              className="w-full h-auto object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
          </div>
          
          <div className="mt-6 border-l-2 border-primary pl-4">
            <p className="text-sm font-bold text-foreground uppercase tracking-widest font-mono">
              Founder — Tyler Starks
            </p>
          </div>
        </motion.div>

        {/* Right Column: Founder Text */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="flex flex-col justify-center"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              About the Founder
            </h2>
          </div>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              Tyler Starks is the founder of Starks Global Group, an automation infrastructure platform built to help people understand and apply artificial intelligence in a practical, real-world way.
            </p>

            <p>This platform was created with a clear mission:</p>

            <p className="text-xl font-medium text-foreground border-l-2 border-primary/30 pl-4 py-1 italic">
              To remove the confusion and fear surrounding AI—and replace it with clarity, structure, and opportunity.
            </p>

            <p>
              There is a growing concern that artificial intelligence will replace jobs and make it harder for people to succeed. Instead of working against that shift, Tyler has focused on building systems that allow people to use AI as a tool—one that can support them, grow with them, and create new income opportunities.
            </p>

            <p>
              Starks Global Group is not designed only for advanced users or large companies. It is built for everyone.
            </p>

            <p>Whether someone has experience or is starting from zero, the goal is the same:</p>

            <p className="text-xl font-medium text-foreground border-l-2 border-primary/30 pl-4 py-1 italic">
              To provide structured systems that make AI understandable, accessible, and usable.
            </p>

            <p>
              Tyler and his team research, test, and build automation systems daily using real AI software tools. These systems are not theoretical—they are implemented, refined, and continuously improved before being shared on the platform.
            </p>

            <p>
              New tools and automation systems are consistently evaluated and added, giving users access to updated, real-world solutions without needing to figure everything out alone.
            </p>

            <p>
              Each blueprint is designed to save time, reduce trial and error, and eliminate unnecessary costs by providing systems that have already been built and tested.
            </p>

            <p>The long-term vision is simple:</p>

            <p className="text-xl font-medium text-foreground border-l-2 border-primary/30 pl-4 py-1 italic">
              To help people stop seeing AI as something that works against them—and start using it as something that works for them.
            </p>

            <p>
              This platform exists to show that AI is not limited to experts. It can be learned, applied, and used by anyone willing to take the time to understand it.
            </p>

            <div className="pt-4">
              <p className="text-muted-foreground mb-1">For direct inquiries, Tyler can be reached at:</p>
              <a href="mailto:ceo@starksglobalgroup.net" className="inline-flex items-center text-primary hover:text-primary/80 transition-colors font-mono font-medium mt-1">
                ceo@starksglobalgroup.net
              </a>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border relative">
            <div className="absolute top-0 left-0 w-1/4 h-[1px] bg-primary" />
            <p className="text-xl md:text-2xl font-bold tracking-tight text-primary font-mono uppercase">
              Built on real systems. Designed for real people.
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default FounderSection;