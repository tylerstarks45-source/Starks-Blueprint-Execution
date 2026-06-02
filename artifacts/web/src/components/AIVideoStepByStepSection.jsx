import React from 'react';
import { motion } from 'framer-motion';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { toolAffiliateLinks } from '@/config/toolAffiliateLinks.js';

const steps = [
  {
    id: 'step-1',
    title: '1. Set Up Google Sheets Database',
    toolLink: toolAffiliateLinks.googleSheets,
    toolName: 'Google Sheets',
    instructions: 'Create a new Google Sheet to act as your content database. This will trigger the entire automation.',
    actions: [
      'Create columns: Topic, Hook, Script, Video Status, Platform, Post Status.',
      'Add a test row with a sample topic (e.g., "3 AI Tools for Productivity").',
      'Set "Video Status" to "Pending".'
    ],
    output: 'A structured database ready to feed topics to the AI.',
    troubleshooting: 'Ensure the sheet is accessible by Make.com (use a Google Workspace account or share properly).'
  },
  {
    id: 'step-2',
    title: '2. Configure OpenRouter API',
    toolLink: toolAffiliateLinks.openrouter,
    toolName: 'OpenRouter',
    instructions: 'Set up OpenRouter to access top-tier LLMs for script writing.',
    actions: [
      'Create an OpenRouter account and generate an API key.',
      'Create a system prompt: "You are an expert short-form video scriptwriter. Write a 30-second script about [Topic]. Include a strong hook."',
      'Save the API key securely.'
    ],
    output: 'API access ready for Make.com integration.',
    troubleshooting: 'Check billing limits on OpenRouter if API calls fail.'
  },
  {
    id: 'step-3',
    title: '3. Connect Sheets to Make.com',
    toolLink: toolAffiliateLinks.make,
    toolName: 'Make.com',
    instructions: 'Build the first module of your automation to watch for new topics.',
    actions: [
      'Create a new scenario in Make.com.',
      'Add the "Google Sheets - Watch Rows" module.',
      'Connect your Google account and select your database sheet.',
      'Set the limit to 1 for testing.'
    ],
    output: 'Make.com successfully detects new rows in your sheet.',
    troubleshooting: 'If rows aren\'t detected, check if the sheet has headers and the module is set to use them.'
  },
  {
    id: 'step-4',
    title: '4. Connect OpenRouter to Make.com',
    toolLink: toolAffiliateLinks.openrouter,
    toolName: 'OpenRouter',
    instructions: 'Add the AI brain to write the script based on the sheet topic.',
    actions: [
      'Add an "HTTP - Make a request" module after Google Sheets.',
      'Set URL to OpenRouter API endpoint.',
      'Map the "Topic" variable from Sheets into the prompt payload.',
      'Parse the JSON response to extract the script.'
    ],
    output: 'Automated script generation from a simple topic input.',
    troubleshooting: 'Use the Make.com JSON parser module if the HTTP response isn\'t automatically formatted.'
  },
  {
    id: 'step-5',
    title: '5. Generate Video with Vidfly',
    toolLink: toolAffiliateLinks.vidfly,
    toolName: 'Vidfly',
    instructions: 'Send the AI-generated script to Vidfly to create the actual video.',
    actions: [
      'Add the Vidfly module (or HTTP request to their API).',
      'Map the generated script into the text input.',
      'Select voice, aspect ratio (9:16), and background style.',
      'Add a "Sleep" module or webhook to wait for video completion.'
    ],
    output: 'A fully edited MP4 video file URL.',
    troubleshooting: 'Video generation takes time. Ensure your Make.com scenario doesn\'t time out.'
  },
  {
    id: 'step-6',
    title: '6. Auto-Post to Social Media',
    toolLink: toolAffiliateLinks.buffer,
    toolName: 'Buffer',
    instructions: 'Distribute the finished video to your channels.',
    actions: [
      'Add Buffer or GoHighLevel modules to the end of the scenario.',
      'Map the video URL and the generated caption/hashtags.',
      'Set the posting schedule or publish immediately.',
      'Update the Google Sheet "Post Status" to "Published".'
    ],
    output: 'Video is live on TikTok, Instagram Reels, and YouTube Shorts.',
    troubleshooting: 'Check file size limits for each social platform API.'
  },
  {
    id: 'step-7',
    title: '7. Automation Logic & Error Handling',
    toolLink: toolAffiliateLinks.make,
    toolName: 'Make.com',
    instructions: 'Make the system robust and error-proof.',
    actions: [
      'Add error handlers (Ignore or Break) to API modules.',
      'Set up a router to handle different platforms if needed.',
      'Schedule the Make.com scenario to run every hour.'
    ],
    output: 'A resilient system that runs 24/7 without crashing.',
    troubleshooting: 'Review Make.com execution history logs to catch silent failures.'
  },
  {
    id: 'step-8',
    title: '8. Testing & Deployment',
    instructions: 'Run a full end-to-end test before scaling up.',
    actions: [
      'Add 3 test topics to the Google Sheet.',
      'Run the Make.com scenario manually.',
      'Verify the scripts, video quality, and successful posting.',
      'Turn the scenario ON.'
    ],
    output: 'A fully deployed, money-making content engine.',
    troubleshooting: 'If the video looks weird, tweak the OpenRouter prompt to provide better visual cues to Vidfly.'
  }
];

const AIVideoStepByStepSection = () => {
  return (
    <section className="py-20 relative z-10 bg-background/50 border-y border-primary/10">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 glow-text-purple">Step-by-Step Execution</h2>
          <p className="text-[var(--text-secondary)]">Follow this exact sequence to build the architecture.</p>
        </motion.div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <AccordionItem value={step.id} className="sci-fi-card border-primary/20 px-2 group">
                <AccordionTrigger className="text-lg font-bold text-white hover:text-primary transition-colors hover:no-underline">
                  {step.title}
                </AccordionTrigger>
                <AccordionContent className="text-[var(--text-secondary)] pt-4 pb-2">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6 pb-4 border-b border-white/5">
                    <p className="text-base m-0">{step.instructions}</p>
                    {step.toolLink && (
                      <a
                        href={step.toolLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center justify-center px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg text-sm font-bold transition-all hover:glow-border-cyan group-hover:shadow-[0_0_10px_hsl(var(--primary)/0.2)] whitespace-nowrap"
                      >
                        Open {step.toolName} <ExternalLink className="w-3.5 h-3.5 ml-2" />
                      </a>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-background/50 p-4 rounded-lg border border-white/5">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Exact Actions
                      </h4>
                      <ul className="list-disc list-inside space-y-1 ml-6 text-sm">
                        {step.actions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                        <h4 className="text-primary font-semibold mb-1 text-sm uppercase tracking-wider">Expected Output</h4>
                        <p className="text-sm">{step.output}</p>
                      </div>
                      <div className="bg-destructive/5 p-4 rounded-lg border border-destructive/20">
                        <h4 className="text-destructive font-semibold mb-1 text-sm uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Troubleshooting
                        </h4>
                        <p className="text-sm">{step.troubleshooting}</p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default AIVideoStepByStepSection;