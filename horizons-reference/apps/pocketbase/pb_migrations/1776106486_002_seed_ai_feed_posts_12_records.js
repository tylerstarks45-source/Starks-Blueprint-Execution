/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");

  const record0 = new Record(collection);
    record0.set("title", "AI Feed Now Live \u2014 Your Private Intelligence Hub");
    record0.set("slug", "ai-feed-launch");
    record0.set("short_text", "We just launched the AI Feed \u2014 a real-time intelligence stream for everything happening in AI, automation, and systems. Stay ahead of the curve.");
    record0.set("long_form_content", "The AI Feed is now live.\n\nThis is your private intelligence hub for:\n\u2022 New AI tools and releases\n\u2022 System breakdowns and blueprints\n\u2022 Platform updates and innovations\n\u2022 Tutorials and actionable tips\n\nEverything you need to stay ahead in real time.\n\nNo noise. No filler. Only high-value updates that matter.\n\nThis is how you stay informed without the chaos of social media.");
    record0.set("category", "Updates");
    record0.set("featured", true);
    record0.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record0.set("tags", ["AI", "Systems"]);
    record0.set("related_blueprint_id", null);
    record0.set("related_tool_ids", []);
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
    record1.set("title", "Claude 3.5 Sonnet: The AI That Changed Everything");
    record1.set("slug", "claude-3-5-sonnet-spotlight");
    record1.set("short_text", "Claude 3.5 Sonnet is now the most capable AI model available. Here's why it matters for your systems.");
    record1.set("long_form_content", "Claude 3.5 Sonnet just became the most capable AI model on the market.\n\nWhat changed:\n\u2022 200K context window (reads entire books)\n\u2022 Better reasoning and analysis\n\u2022 Faster processing\n\u2022 More reliable outputs\n\nWhy it matters:\nIf you're building AI systems, Claude is now the gold standard for complex tasks like:\n\u2022 System design and architecture\n\u2022 Content analysis and research\n\u2022 Code generation and debugging\n\u2022 Strategic planning\n\nThis is the AI to build with right now.");
    record1.set("category", "AI Tools");
    record1.set("featured", false);
    record1.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record1.set("tags", ["AI", "Tools"]);
    record1.set("related_blueprint_id", "system-01");
    record1.set("related_tool_ids", ["claude", "magai"]);
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
    record2.set("title", "System 01: AI Content Creation Engine");
    record2.set("slug", "system-01-content-engine");
    record2.set("short_text", "The complete system for generating 20+ pieces of content daily with AI. Blog posts, videos, emails, social media \u2014 all automated.");
    record2.set("long_form_content", "System 01 is the AI Content Creation Engine.\n\nWhat it does:\n\u2022 Generates blog posts (SEO optimized)\n\u2022 Creates video scripts\n\u2022 Writes email sequences\n\u2022 Produces social media content\n\u2022 Automates publishing\n\nThe flow:\n1. AI generates content from your ideas\n2. System formats and optimizes\n3. Content publishes across platforms\n4. Analytics track performance\n5. System learns and improves\n\nResult: 20+ pieces of content daily with minimal manual work.\n\nThis system can generate $5K-$20K/month in affiliate revenue when connected to the right offers.");
    record2.set("category", "Systems");
    record2.set("featured", false);
    record2.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record2.set("tags", ["Systems", "Automation"]);
    record2.set("related_blueprint_id", "system-01");
    record2.set("related_tool_ids", ["magai", "creatify", "getresponse"]);
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
    record3.set("title", "New This Week: 5 AI Tools You Need to Know About");
    record3.set("slug", "new-tools-this-week");
    record3.set("short_text", "Five new AI tools launched this week that are changing the game. Here's what they do and why they matter.");
    record3.set("long_form_content", "Five new AI tools launched this week:\n\n1. Runway Gen-3 \u2014 AI video generation that's getting scary good\n2. Perplexity Pro \u2014 Real-time AI research with live web access\n3. Dify \u2014 Open-source AI workflow builder\n4. Synthesia 2.0 \u2014 AI avatar video creation\n5. Typeform AI \u2014 Intelligent form builder with AI logic\n\nWhy they matter:\nEach of these tools fills a gap in the AI ecosystem. Together, they make building automated systems faster and cheaper than ever.\n\nThe tools that matter are the ones that integrate into systems. These five do exactly that.");
    record3.set("category", "Updates");
    record3.set("featured", false);
    record3.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record3.set("tags", ["Tools", "AI"]);
    record3.set("related_blueprint_id", null);
    record3.set("related_tool_ids", ["runway", "perplexity", "dify", "synthesia", "typeform"]);
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
    record4.set("title", "The 3-Step Framework for Building Any AI System");
    record4.set("slug", "ai-system-framework");
    record4.set("short_text", "Every successful AI system follows the same 3-step framework. Learn it, and you can build anything.");
    record4.set("long_form_content", "Every successful AI system follows the same 3-step framework:\n\nSTEP 1: INPUT\nWhat data or information goes into the system?\n\u2022 User input\n\u2022 External data\n\u2022 Automated data collection\n\nSTEP 2: PROCESS\nWhat does the AI do with that input?\n\u2022 Generate content\n\u2022 Analyze data\n\u2022 Make decisions\n\u2022 Create outputs\n\nSTEP 3: OUTPUT\nWhat does the system produce?\n\u2022 Content\n\u2022 Leads\n\u2022 Revenue\n\u2022 Insights\n\nMaster this framework, and you can build any system.\n\nMost people skip Step 1 or Step 3 and wonder why their systems don't work. Get all three right, and you have a machine.");
    record4.set("category", "Case Studies");
    record4.set("featured", false);
    record4.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record4.set("tags", ["Systems", "Tutorial"]);
    record4.set("related_blueprint_id", "system-01");
    record4.set("related_tool_ids", []);
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
    record5.set("title", "System 04: AI Lead Generation & Appointment Setter");
    record5.set("slug", "system-04-lead-gen");
    record5.set("short_text", "The complete system for finding leads, reaching out with AI, and booking sales calls on autopilot. High-ticket services love this.");
    record5.set("long_form_content", "System 04 is the AI Lead Generation & Appointment Setter.\n\nWhat it does:\n\u2022 Finds targeted leads automatically\n\u2022 Personalizes outreach with AI\n\u2022 Sends messages at scale\n\u2022 Qualifies responses automatically\n\u2022 Books calls on autopilot\n\nThe flow:\n1. AI finds leads (Apollo, Clay)\n2. AI personalizes messages\n3. Outreach system sends at scale\n4. AI handles responses\n5. Booking system converts\n6. You close the deal\n\nResult: 5-10 booked calls per week with minimal manual work.\n\nHigh-ticket service providers are using this to book $5K-$10K deals on autopilot.");
    record5.set("category", "Systems");
    record5.set("featured", false);
    record5.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record5.set("tags", ["Systems", "Automation"]);
    record5.set("related_blueprint_id", "system-04");
    record5.set("related_tool_ids", ["apollo", "instantly", "make"]);
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
    record6.set("title", "Make.com: The Automation Platform That Powers Everything");
    record6.set("slug", "make-automation-platform");
    record6.set("short_text", "Make.com is the backbone of every serious automation system. Here's why it's essential.");
    record6.set("long_form_content", "Make.com is the automation platform that powers serious systems.\n\nWhat it does:\n\u2022 Connects 1000+ apps and tools\n\u2022 Creates complex workflows\n\u2022 Automates repetitive tasks\n\u2022 Scales without code\n\nWhy it matters:\nIf you're building AI systems, Make is how you connect everything together.\n\nExample workflow:\n1. New lead comes in (Apollo)\n2. Make triggers AI personalization (Claude)\n3. Email sends automatically (Instantly)\n4. Response tracked (Gmail)\n5. Calendar booking triggered (Calendly)\n\nAll automated. All connected. All in Make.\n\nThis is the tool that turns individual tools into a system.");
    record6.set("category", "AI Tools");
    record6.set("featured", false);
    record6.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record6.set("tags", ["Tools", "Automation"]);
    record6.set("related_blueprint_id", "system-04");
    record6.set("related_tool_ids", ["make", "apollo", "instantly"]);
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
    record7.set("title", "Why Most AI Projects Fail (And How to Avoid It)");
    record7.set("slug", "why-ai-projects-fail");
    record7.set("short_text", "Most AI projects fail for the same 3 reasons. Here's how to avoid them.");
    record7.set("long_form_content", "Most AI projects fail for the same 3 reasons:\n\nREASON 1: No Clear Input\nPeople don't define what data goes into the system.\nResult: Garbage in, garbage out.\n\nREASON 2: Wrong Tool Choice\nPeople pick tools based on hype, not fit.\nResult: Tools don't work together.\n\nREASON 3: No Measurement\nPeople don't track results.\nResult: They don't know if it's working.\n\nHow to avoid it:\n1. Define your input clearly\n2. Choose tools that work together\n3. Track everything\n\nDo these three things, and your AI project will work.\n\nSkip any of them, and it will fail.");
    record7.set("category", "Case Studies");
    record7.set("featured", false);
    record7.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record7.set("tags", ["Tutorial", "Systems"]);
    record7.set("related_blueprint_id", null);
    record7.set("related_tool_ids", []);
  try {
    app.save(record7);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record8 = new Record(collection);
    record8.set("title", "System 02: AI Affiliate Marketing Automation");
    record8.set("slug", "system-02-affiliate");
    record8.set("short_text", "The complete system for building a $5K-$20K/month affiliate business with AI. Content, traffic, conversions \u2014 all automated.");
    record8.set("long_form_content", "System 02 is the AI Affiliate Marketing Automation system.\n\nWhat it does:\n\u2022 AI generates SEO-optimized content\n\u2022 Content drives organic traffic\n\u2022 Affiliate links convert visitors\n\u2022 System tracks and optimizes\n\u2022 Revenue scales automatically\n\nThe flow:\n1. AI generates 20+ blog posts\n2. Posts rank in Google\n3. Visitors click affiliate links\n4. System tracks conversions\n5. Best performers get scaled\n6. Revenue compounds\n\nResult: $5K-$20K/month in passive affiliate revenue.\n\nThis system works because it automates the boring parts (content creation, publishing, tracking) so you can focus on optimization.");
    record8.set("category", "Systems");
    record8.set("featured", false);
    record8.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record8.set("tags", ["Systems", "Marketing"]);
    record8.set("related_blueprint_id", "system-02");
    record8.set("related_tool_ids", ["getresponse", "creatify", "magai"]);
  try {
    app.save(record8);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record9 = new Record(collection);
    record9.set("title", "Platform Update: New Systems & Tools Added");
    record9.set("slug", "platform-update-new-content");
    record9.set("short_text", "We added 5 new systems and 20 new tools to the platform. Here's what's new.");
    record9.set("long_form_content", "We just added to the platform:\n\nNEW SYSTEMS:\n\u2022 System 01: AI Content Creation Engine\n\u2022 System 02: AI Affiliate Marketing\n\u2022 System 04: AI Lead Generation\n\u2022 System 05: AI Dropshipping Automation\n\nNEW TOOLS:\n\u2022 20+ AI tools in the marketplace\n\u2022 Complete tool stack for each system\n\u2022 Integration guides for all tools\n\nWhat this means:\nYou now have everything you need to build a complete AI business.\n\nPick a system. Get the tools. Build it. Scale it.\n\nThat's the path to $10K-$100K/month.");
    record9.set("category", "Updates");
    record9.set("featured", false);
    record9.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record9.set("tags", ["AI", "Systems"]);
    record9.set("related_blueprint_id", "system-01");
    record9.set("related_tool_ids", []);
  try {
    app.save(record9);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record10 = new Record(collection);
    record10.set("title", "Creatify: AI Video Generation That Actually Works");
    record10.set("slug", "creatify-video-generation");
    record10.set("short_text", "Creatify generates professional videos from text in minutes. Here's why it's a game-changer for content systems.");
    record10.set("long_form_content", "Creatify is the AI video generation tool that actually works.\n\nWhat it does:\n\u2022 Converts text to video\n\u2022 Generates scripts automatically\n\u2022 Creates professional visuals\n\u2022 Adds music and effects\n\u2022 Exports ready-to-post videos\n\nWhy it matters:\nVideo is the highest-converting content format. But creating videos is slow and expensive.\n\nCreatify changes that.\n\nNow you can:\n\u2022 Generate 10 videos per day\n\u2022 Cost: $0.50-$2 per video\n\u2022 Quality: Professional\n\u2022 Time: 5 minutes per video\n\nThis is how you scale video content without a production team.");
    record10.set("category", "AI Tools");
    record10.set("featured", false);
    record10.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record10.set("tags", ["Tools", "Video"]);
    record10.set("related_blueprint_id", "system-01");
    record10.set("related_tool_ids", ["creatify", "runway", "synthesia"]);
  try {
    app.save(record10);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record11 = new Record(collection);
    record11.set("title", "The AI Tools You Actually Need (And the Ones You Don't)");
    record11.set("slug", "essential-ai-tools");
    record11.set("short_text", "There are 1000+ AI tools. Here are the 5 you actually need to build systems.");
    record11.set("long_form_content", "There are 1000+ AI tools.\n\nYou need 5:\n\n1. AI GENERATION (Claude, ChatGPT)\nFor: Writing, analysis, planning\n\n2. VIDEO CREATION (Creatify, Runway)\nFor: Content creation, engagement\n\n3. AUTOMATION (Make, Zapier)\nFor: Connecting tools, scaling\n\n4. EMAIL (GetResponse, Brevo)\nFor: Nurturing, conversions\n\n5. ANALYTICS (Google Analytics, Mixpanel)\nFor: Tracking, optimization\n\nEverything else is optional.\n\nMost people buy 20 tools and use 3.\n\nBuy 5 tools and master them.\n\nThat's how you build systems that work.");
    record11.set("category", "Case Studies");
    record11.set("featured", false);
    record11.set("image_url", "https://images.unsplash.com/photo-1677442d019cecf8d5a594b4e1d0b5f5?w=1200&h=630&fit=crop");
    record11.set("tags", ["Tools", "Tutorial"]);
    record11.set("related_blueprint_id", null);
    record11.set("related_tool_ids", ["claude", "creatify", "make", "getresponse"]);
  try {
    app.save(record11);
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