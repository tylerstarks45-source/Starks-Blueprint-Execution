/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");

  const record0 = new Record(collection);
    record0.set("title", "How AI Dropshipping Works: The Complete Breakdown");
    record0.set("slug", "ai-dropshipping-breakdown");
    record0.set("category", "Systems");
    record0.set("short_text", "Discover how AI finds winning products, creates ads, and fulfills orders automatically. This is the future of ecommerce.");
    record0.set("long_form_content", "The AI Dropshipping Automation System is a complete game-changer for ecommerce. Here's how it works step-by-step:\n\n1. AI Product Discovery - AI scans marketplaces and social trends to find high-demand products\n2. Store Creation - Products are automatically added to your Shopify store with optimized pages\n3. AI Ad Generation - AI creates video ads, product creatives, and ad copy\n4. Traffic Activation - Ads are sent to TikTok and Facebook at scale\n5. Automated Checkout - Customers purchase with zero manual work\n6. Fulfillment - Orders are automatically processed and shipped\n7. Optimization - Data is used to scale winners and kill losers\n\nThis system can generate $5K-$50K+ per month when set up correctly.");
    record0.set("image_url", "https://images.unsplash.com/photo-1643101807331-21a4a3f081d5");
    record0.set("tags", ["Systems", "Automation"]);
    record0.set("featured", true);
    record0.set("related_blueprint_id", "system-05");
    record0.set("related_tool_ids", ["shopify", "autods", "creatify"]);
  try {
    app.save(record0);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record1 = new Record(collection);
    record1.set("title", "Magai AI: 50+ AI Models in One Chat");
    record1.set("slug", "magai-ai-spotlight");
    record1.set("category", "AI Tools");
    record1.set("short_text", "Stop paying for 10 different AI tools. Magai combines ChatGPT, Claude, Gemini, and 47 others in one platform.");
    record1.set("long_form_content", "Magai AI is the Swiss Army knife of AI tools. Instead of jumping between ChatGPT, Claude, Gemini, and other platforms, you get all 50+ models in one chat interface.\n\nKey Features:\n- Switch between AI models mid-conversation\n- AI personas for custom workflows\n- Built-in document editor (export to PDF/DOCX)\n- File uploads and web browsing\n- Team collaboration\n- AI image and video generation\n\nPricing: $20-$40/month (vs hundreds if you subscribed to each tool separately)\n\nThis is essential for anyone building AI systems.");
    record1.set("image_url", "https://images.unsplash.com/photo-1677442136019-21780ecad995");
    record1.set("tags", ["AI", "Tools"]);
    record1.set("featured", false);
    record1.set("related_tool_ids", ["magai", "openai", "anthropic"]);
  try {
    app.save(record1);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record2 = new Record(collection);
    record2.set("title", "From Zero to $10K/Month: AI Lead Generation Case Study");
    record2.set("slug", "lead-gen-case-study");
    record2.set("category", "Case Studies");
    record2.set("short_text", "How one agency used AI lead generation to book 15 high-ticket calls per month and close $10K+ in deals.");
    record2.set("long_form_content", "Here's a real case study of how the AI Lead Generation & Appointment Setter System works in practice:\n\nThe Setup:\n- Service: AI automation consulting ($5K per project)\n- Target: SaaS companies with 10-100 employees\n- Tools: Apollo for leads, AI for personalization, Instantly for outreach\n\nThe Results (First 30 Days):\n- 500 leads sourced\n- 150 personalized outreach messages sent\n- 23 replies received\n- 8 booked calls\n- 3 closed deals = $15K revenue\n\nThe Key:\nAI personalization made the difference. Instead of generic cold emails, each message was tailored to the prospect's specific pain points.\n\nThis system works because it automates the boring parts (finding leads, writing emails) so you can focus on closing deals.");
    record2.set("image_url", "https://images.unsplash.com/photo-1667371927761-8fa90f33a248");
    record2.set("tags", ["Case Study"]);
    record2.set("featured", true);
    record2.set("related_blueprint_id", "system-04");
    record2.set("related_tool_ids", ["apollo", "instantly", "make"]);
  try {
    app.save(record2);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record3 = new Record(collection);
    record3.set("title", "5 Automation Mistakes That Cost You Money");
    record3.set("slug", "automation-mistakes");
    record3.set("category", "Automation");
    record3.set("short_text", "Most people automate the wrong things. Here are the 5 biggest mistakes and how to fix them.");
    record3.set("long_form_content", "Automation is powerful, but most people do it wrong. Here are the 5 biggest mistakes:\n\n1. Automating Too Early - Don't automate before you understand the process\n2. Ignoring Data - Set up tracking BEFORE you automate\n3. Wrong Tool Choice - Using Zapier when you need Make.com (or vice versa)\n4. No Error Handling - Automations fail silently and cost you money\n5. Forgetting the Human Touch - Some things shouldn't be automated\n\nThe Fix:\n- Understand your process first\n- Set up analytics and tracking\n- Choose the right tool for the job\n- Build in error notifications\n- Keep humans in the loop for high-value decisions\n\nAutomation should save you time AND money. If it's not doing both, you're doing it wrong.");
    record3.set("tags", ["Automation", "Systems"]);
    record3.set("featured", false);
    record3.set("related_tool_ids", ["make", "zapier", "albato"]);
  try {
    app.save(record3);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record4 = new Record(collection);
    record4.set("title", "Why Cold Email Still Works (And How to Do It Right)");
    record4.set("slug", "cold-email-strategy");
    record4.set("category", "Marketing");
    record4.set("short_text", "Cold email has a 2-3% reply rate. Here's how to get 5-8% with AI personalization.");
    record4.set("long_form_content", "Cold email is dead... said nobody who's actually making money with it.\n\nThe Truth:\n- Average cold email reply rate: 2-3%\n- With AI personalization: 5-8%\n- With AI + perfect targeting: 10-15%\n\nThe Formula:\n1. Find the right person (Apollo, Clay)\n2. Research their company (AI + web scraping)\n3. Personalize the message (AI generation)\n4. Send at the right time (automation)\n5. Follow up automatically (sequences)\n\nThe Results:\n- 500 emails sent\n- 25-40 replies\n- 5-8 booked calls\n- 2-3 closed deals\n\nThis is how high-ticket services get clients. This is how agencies scale. This is how you build a $100K+ business.");
    record4.set("tags", ["Marketing", "Email"]);
    record4.set("featured", false);
    record4.set("related_blueprint_id", "system-04");
    record4.set("related_tool_ids", ["instantly", "smartlead", "getresponse"]);
  try {
    app.save(record4);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record5 = new Record(collection);
    record5.set("title", "New System Released: AI Content Creation Engine");
    record5.set("slug", "ai-content-system-launch");
    record5.set("category", "Updates");
    record5.set("short_text", "We just released System 01: AI Content Creation Engine. Here's what it does.");
    record5.set("long_form_content", "We're excited to announce the release of System 01: AI Content Creation Engine.\n\nThis system automates:\n- Blog post generation\n- Video script creation\n- Social media content\n- Email sequences\n- Landing page copy\n\nAll powered by AI and optimized for SEO and conversions.\n\nWhat's Included:\n- Complete system breakdown\n- Step-by-step deployment roadmap\n- Required software stack\n- Real-world use cases\n\nThis system can generate 10-20 pieces of content per day with minimal manual work.\n\nReady to get started? Check out the full blueprint.");
    record5.set("image_url", "https://images.unsplash.com/photo-1695144244472-a4543101ef35");
    record5.set("tags", ["Systems", "AI"]);
    record5.set("featured", true);
    record5.set("related_blueprint_id", "system-01");
    record5.set("related_tool_ids", ["magai", "creatify", "getresponse"]);
  try {
    app.save(record5);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record6 = new Record(collection);
    record6.set("title", "Zapier vs Make.com vs Albato: Which Automation Tool Should You Use?");
    record6.set("slug", "automation-tool-comparison");
    record6.set("category", "AI Tools");
    record6.set("short_text", "We compared the 3 biggest automation platforms. Here's which one wins for different use cases.");
    record6.set("long_form_content", "Choosing the right automation tool is critical. Here's how the big three compare:\n\nZAPIER\n- Best for: Simple integrations, beginners\n- Pricing: $19-$99/month\n- Strength: Huge app library (6000+)\n- Weakness: Can get expensive fast\n\nMAKE.COM\n- Best for: Complex workflows, power users\n- Pricing: $9-$299/month\n- Strength: Flexible, powerful, visual builder\n- Weakness: Steeper learning curve\n\nALBATO\n- Best for: Cost-conscious teams, AI features\n- Pricing: Free-$65/month\n- Strength: Affordable, 1000+ apps, AI tools\n- Weakness: Smaller community\n\nThe Verdict:\n- Starting out? Zapier\n- Building complex systems? Make.com\n- Want AI + affordability? Albato\n\nMost successful businesses use 2-3 of these together.");
    record6.set("tags", ["AI", "Tools", "Automation"]);
    record6.set("featured", false);
    record6.set("related_tool_ids", ["zapier", "make", "albato"]);
  try {
    app.save(record6);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record7 = new Record(collection);
    record7.set("title", "The Complete Guide to AI Affiliate Marketing Systems");
    record7.set("slug", "ai-affiliate-guide");
    record7.set("category", "Systems");
    record7.set("short_text", "How to build a $5K-$20K/month affiliate business using AI. The complete system breakdown.");
    record7.set("long_form_content", "AI affiliate marketing is one of the fastest ways to build a passive income business. Here's the complete system:\n\nPhase 1: Research & Selection\n- Use AI to find trending products\n- Analyze competitor strategies\n- Choose high-commission products\n\nPhase 2: Content Creation\n- AI generates blog posts (SEO optimized)\n- AI creates video scripts\n- AI writes email sequences\n\nPhase 3: Traffic Generation\n- Organic (SEO + content)\n- Paid (Facebook, TikTok ads)\n- Email marketing\n\nPhase 4: Conversion Optimization\n- A/B test landing pages\n- Optimize email sequences\n- Track affiliate links\n\nPhase 5: Scaling\n- Double down on winners\n- Kill losing campaigns\n- Reinvest profits\n\nThe Numbers:\n- 100 blog posts = 1000 visitors/month\n- 1000 visitors = 10-20 affiliate sales\n- 10-20 sales \u00d7 $500 commission = $5K-$10K/month\n\nThis system scales to $20K-$50K/month with the right products and traffic.");
    record7.set("tags", ["Systems", "Marketing"]);
    record7.set("featured", false);
    record7.set("related_blueprint_id", "system-02");
    record7.set("related_tool_ids", ["getresponse", "creatify", "magai"]);
  try {
    app.save(record7);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }
}, (app) => {
  // Rollback: record IDs not known, manual cleanup needed
})