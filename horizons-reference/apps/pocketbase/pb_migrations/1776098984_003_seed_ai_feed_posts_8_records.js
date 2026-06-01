/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");

  const record0 = new Record(collection);
    record0.set("title", "Content + Traffic + Sales System Breakdown");
    record0.set("slug", "content-traffic-sales-system-breakdown");
    record0.set("short_text", "Discover the complete system architecture that drives content creation, traffic generation, and sales conversion in one unified framework.");
    record0.set("long_form_content", "In this comprehensive breakdown, we explore the three pillars of a successful online business: content creation, traffic generation, and sales conversion. Learn how to integrate these elements into a cohesive system that works together to scale your business. We'll cover the tools, strategies, and workflows that top performers use to build sustainable revenue streams.");
    record0.set("category", "Systems");
    record0.set("featured", true);
    record0.set("image_url", "https://images.unsplash.com/photo-1643101807331-21a4a3f081d5");
    record0.set("tags", ["Systems", "Marketing", "Automation"]);
    record0.set("related_tool_ids", ["tool1", "tool2"]);
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
    record1.set("title", "Top 5 AI Tools for Email Automation");
    record1.set("slug", "top-5-ai-tools-email-automation");
    record1.set("short_text", "Explore the best AI-powered email automation tools that can transform your marketing campaigns and increase conversions.");
    record1.set("long_form_content", "Email automation is one of the most effective ways to nurture leads and drive sales. In this guide, we review the top 5 AI tools that are revolutionizing email marketing. From intelligent segmentation to predictive send times, these tools use artificial intelligence to optimize every aspect of your email campaigns. Discover which tool is right for your business and how to implement it effectively.");
    record1.set("category", "AI Tools");
    record1.set("featured", true);
    record1.set("image_url", "https://images.unsplash.com/photo-1677442136019-21780ecad995");
    record1.set("tags", ["AI", "Email", "Tools", "Marketing"]);
    record1.set("related_tool_ids", ["tool3", "tool4", "tool5"]);
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
    record2.set("title", "How AI is Changing Digital Marketing");
    record2.set("slug", "how-ai-changing-digital-marketing");
    record2.set("short_text", "Understand the transformative impact of artificial intelligence on modern digital marketing strategies and tactics.");
    record2.set("long_form_content", "Artificial intelligence is reshaping the digital marketing landscape. From personalization engines to predictive analytics, AI is enabling marketers to make smarter decisions and deliver better results. This post explores the key ways AI is changing digital marketing, including customer segmentation, content optimization, and campaign automation. Learn how to leverage these technologies to stay ahead of the competition.");
    record2.set("category", "Updates");
    record2.set("featured", false);
    record2.set("tags", ["AI", "Marketing", "Automation"]);
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
    record3.set("title", "New Blueprint Released: AI Agency System");
    record3.set("slug", "new-blueprint-ai-agency-system");
    record3.set("short_text", "Introducing our latest blueprint: a complete system for building and scaling an AI-powered agency business.");
    record3.set("long_form_content", "We're excited to announce the release of our new AI Agency System blueprint. This comprehensive guide walks you through every step of building a profitable AI agency, from service offerings to client acquisition to delivery systems. Whether you're starting from scratch or scaling an existing agency, this blueprint provides the roadmap you need to succeed in the rapidly growing AI services market.");
    record3.set("category", "Systems");
    record3.set("featured", false);
    record3.set("tags", ["Systems", "AI", "Tutorial"]);
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
    record4.set("title", "How We Generated $50K with AI Funnels");
    record4.set("slug", "how-we-generated-50k-ai-funnels");
    record4.set("short_text", "A detailed case study showing exactly how we built and optimized AI-powered sales funnels that generated $50,000 in revenue.");
    record4.set("long_form_content", "In this case study, we break down the exact funnel architecture, copywriting strategies, and AI tools we used to generate $50,000 in revenue. You'll learn about our lead magnet strategy, email sequences, sales page optimization, and the AI tools that automated much of the process. This is a real-world example of how to apply AI to funnel building for maximum profitability.");
    record4.set("category", "Case Studies");
    record4.set("featured", false);
    record4.set("tags", ["Case Study", "Funnels", "AI", "Marketing"]);
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
    record5.set("title", "Automation Workflow: From Lead to Sale");
    record5.set("slug", "automation-workflow-lead-to-sale");
    record5.set("short_text", "Learn the complete automation workflow that takes a prospect from initial lead capture all the way through to a completed sale.");
    record5.set("long_form_content", "Automation is the key to scaling without burning out. In this detailed guide, we map out the entire customer journey from lead capture to sale, showing you exactly where automation can save time and improve results. We cover lead scoring, email sequences, SMS follow-ups, and sales team notifications. By the end, you'll have a blueprint for building your own automated sales machine.");
    record5.set("category", "Automation");
    record5.set("featured", false);
    record5.set("image_url", "https://images.unsplash.com/photo-1667371927761-8fa90f33a248");
    record5.set("tags", ["Automation", "Systems", "Marketing"]);
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
    record6.set("title", "AI Video Generation Tools Comparison");
    record6.set("slug", "ai-video-generation-tools-comparison");
    record6.set("short_text", "Compare the top AI video generation tools and discover which one is best for your content creation needs.");
    record6.set("long_form_content", "Video content is more important than ever, but creating videos is time-consuming and expensive. AI video generation tools are changing that. In this comprehensive comparison, we evaluate the leading AI video tools based on quality, ease of use, pricing, and features. Whether you need to create product demos, explainer videos, or social media content, we'll help you find the perfect tool for your needs.");
    record6.set("category", "AI Tools");
    record6.set("featured", false);
    record6.set("tags", ["AI", "Video", "Tools"]);
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
    record7.set("title", "Building Your First AI System: Step-by-Step");
    record7.set("slug", "building-first-ai-system-step-by-step");
    record7.set("short_text", "A beginner-friendly guide to building your first AI-powered system from scratch, with practical examples and tools.");
    record7.set("long_form_content", "Ready to build your first AI system but don't know where to start? This step-by-step guide walks you through the entire process. We start with the fundamentals of AI systems, then move through planning, tool selection, integration, and optimization. By the end of this guide, you'll have a working AI system that can handle real business tasks. Perfect for entrepreneurs and business owners looking to leverage AI for growth.");
    record7.set("category", "Systems");
    record7.set("featured", false);
    record7.set("tags", ["Systems", "AI", "Tutorial", "Automation"]);
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