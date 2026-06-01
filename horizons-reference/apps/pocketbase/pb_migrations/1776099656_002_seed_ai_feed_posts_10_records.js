/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");

  const record0 = new Record(collection);
    record0.set("title", "This AI System Can Make You Money While You Sleep");
    record0.set("slug", "ai-system-passive-income");
    record0.set("short_text", "Most people try to make money online manually. That's the problem. We built a fully automated system that creates content, turns it into videos, posts across platforms, and drives traffic to affiliate offers\u2014running daily without you touching it.");
    record0.set("long_form_content", "Most people try to make money online manually.\n\nThat's the problem.\n\nWe built a fully automated system that:\n\u2022 Creates content with AI\n\u2022 Turns it into videos\n\u2022 Posts across platforms\n\u2022 Drives traffic to affiliate offers\n\nAnd it runs daily without you touching it.\n\nThis isn't theory. This is how modern online income is built.\n\nThe old way: You create \u2192 You post \u2192 You promote \u2192 You optimize\n\nThe new way: System creates \u2192 System posts \u2192 System promotes \u2192 System optimizes\n\nThe difference? Time. Money. Sanity.\n\nWhen you build a system instead of doing the work manually, everything changes. You go from trading hours for dollars to building an asset that works 24/7.\n\nThis is what separates people making $500/month from people making $50K/month.");
    record0.set("category", "Systems");
    record0.set("featured", true);
    record0.set("tags", ["Systems", "Automation"]);
    record0.set("related_blueprint_id", "system-01");
    record0.set("related_tool_ids", ["magai", "creatify", "getresponse"]);
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
    record1.set("title", "Watch AI Create a Viral Video in 30 Seconds");
    record1.set("slug", "ai-video-generation-demo");
    record1.set("short_text", "AI is now generating hooks, scripts, visuals, and captions faster than any human team. The people winning right now aren't creators. They're system builders.");
    record1.set("long_form_content", "AI is now generating:\n\u2022 Hooks\n\u2022 Scripts\n\u2022 Visuals\n\u2022 Captions\n\nFaster than any human team.\n\nThe people winning right now aren't creators.\n\nThey're system builders.\n\nHere's what changed:\n\nOld Model: Hire videographer \u2192 Wait 2 weeks \u2192 Pay $2K \u2192 Hope it converts\n\nNew Model: AI generates video \u2192 Test immediately \u2192 Iterate daily \u2192 Scale winners\n\nSpeed = competitive advantage.\n\nThe creator who posts 1 perfect video per week loses to the system builder who posts 10 videos per day and scales the winners.\n\nThis isn't about quality anymore. It's about volume + system + optimization.\n\nAI video generation is the cheat code. Use it.");
    record1.set("category", "Systems");
    record1.set("featured", true);
    record1.set("tags", ["Video", "AI", "Systems"]);
    record1.set("related_blueprint_id", "system-01");
    record1.set("related_tool_ids", ["creatify", "runway", "pictory"]);
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
    record2.set("title", "These 3 AI Tools Are Quietly Making People Money");
    record2.set("slug", "three-essential-ai-tools");
    record2.set("short_text", "Most tools don't matter. These do: AI script generators, video generators, and automation tools. Individually they're useful. Together\u2014they become a machine.");
    record2.set("long_form_content", "Most tools don't matter.\n\nThese do:\n\n1. AI Script Generators \u2192 Create content fast\n2. Video Generators \u2192 Turn ideas into assets\n3. Automation Tools \u2192 Scale everything\n\nIndividually they're useful.\n\nTogether\u2014they become a machine.\n\nThe mistake most people make: They buy tools and expect results.\n\nWrong.\n\nTools are just inputs. Systems are what create outputs.\n\nA script generator without a posting system = wasted tool.\nA video generator without a distribution system = wasted tool.\nAn automation tool without clear workflows = wasted tool.\n\nBut combine them with the right system?\n\nThat's when magic happens.\n\nThis is why we don't just recommend tools. We show you how to connect them into working systems.");
    record2.set("category", "AI Tools");
    record2.set("featured", false);
    record2.set("tags", ["Tools", "AI", "Systems"]);
    record2.set("related_tool_ids", ["magai", "creatify", "make"]);
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
    record3.set("title", "Most AI Users Are Doing This Completely Wrong");
    record3.set("slug", "ai-users-biggest-mistake");
    record3.set("short_text", "People think AI = shortcuts. Wrong. AI = leverage. If you're asking random prompts, testing tools blindly, and not connecting systems, you're wasting time.");
    record3.set("long_form_content", "People think AI = shortcuts.\n\nWrong.\n\nAI = leverage.\n\nIf you're:\n\u2022 Asking random prompts\n\u2022 Testing tools blindly\n\u2022 Not connecting systems\n\nYou're wasting time.\n\nThe real power is in:\n\u2022 Structured systems\n\u2022 Repeatable workflows\n\u2022 Automation loops\n\nHere's the difference:\n\nRandom AI User: 'Let me ask ChatGPT to write a blog post'\nSystem Builder: 'Let me run my content system that generates 20 blog posts, turns them into videos, posts them across platforms, and tracks which ones convert'\n\nOne takes 30 minutes and generates nothing.\nOne takes 30 minutes to set up and generates $10K/month.\n\nAI isn't magic. Systems are.\n\nThe people making real money with AI aren't the ones experimenting with prompts. They're the ones who built repeatable systems and let them run.");
    record3.set("category", "Automation");
    record3.set("featured", false);
    record3.set("tags", ["Automation", "Systems", "AI"]);
    record3.set("related_blueprint_id", "system-01");
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
    record4.set("title", "We Tested 50 AI Videos\u2026 Here's What Happened");
    record4.set("slug", "ai-video-test-results");
    record4.set("short_text", "We ran a controlled test: 50 short videos, automated scripts, consistent posting. A few flopped, a few hit average, a small number carried everything. That's the game. Volume + system = results.");
    record4.set("long_form_content", "We ran a controlled test:\n\n50 short videos\nAutomated scripts\nConsistent posting\n\nResult:\n\nA few flopped\nA few hit average\nA small number carried everything\n\nThat's the game.\n\nVolume + system = results.\n\nHere's what we learned:\n\nMost creators obsess over making ONE perfect video.\n\nWrong approach.\n\nThe winning strategy: Make 10 videos, test them, scale the winners.\n\nOut of 50 videos:\n\u2022 35 got minimal views\n\u2022 10 got moderate views\n\u2022 5 went viral\n\nThose 5 videos generated 80% of the traffic.\n\nIf we'd only made 1 video, we'd have a 2% chance of hitting a winner.\n\nIf we'd made 10 videos, we'd have a 10% chance.\n\nIf we make 50 videos, we're guaranteed winners.\n\nThis is why systems beat talent. Systems create volume. Volume creates data. Data creates optimization. Optimization creates results.");
    record4.set("category", "Case Studies");
    record4.set("featured", false);
    record4.set("tags", ["Case Study", "Video", "Systems"]);
    record4.set("related_blueprint_id", "system-01");
    record4.set("related_tool_ids", ["creatify", "runway", "make"]);
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
    record5.set("title", "The 5 Layers Every AI Business Needs");
    record5.set("slug", "five-layers-ai-business");
    record5.set("short_text", "Every real system has: Traffic, Conversion, Automation, Monetization, Optimization. Miss one\u2014and it breaks. We build systems with ALL 5 layers connected.");
    record5.set("long_form_content", "Every real system has:\n\nLayer 1: Traffic\nHow do people find you?\n\nLayer 2: Conversion\nHow do you turn visitors into customers?\n\nLayer 3: Automation\nHow do you scale without burning out?\n\nLayer 4: Monetization\nHow do you actually make money?\n\nLayer 5: Optimization\nHow do you improve and scale?\n\nMiss one\u2014and it breaks.\n\nMost people focus on Layer 1 (traffic) and ignore the rest.\n\nThey get visitors but can't convert them.\n\nOr they convert but can't scale.\n\nOr they scale but can't optimize.\n\nWe build systems with ALL 5 layers connected.\n\nThat's why our systems work.\n\nThat's why they scale.\n\nThat's why they make money.");
    record5.set("category", "Systems");
    record5.set("featured", false);
    record5.set("tags", ["Systems", "Automation"]);
    record5.set("related_blueprint_id", "system-01");
    record5.set("related_tool_ids", ["magai", "make", "getresponse"]);
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
    record6.set("title", "Businesses Pay $1K\u2013$10K For This Simple System");
    record6.set("slug", "high-ticket-lead-gen-system");
    record6.set("short_text", "Companies don't struggle with ideas. They struggle with leads, appointments, and conversions. An AI-powered lead gen system can find prospects, reach out automatically, and book calls. That's real money.");
    record6.set("long_form_content", "Businesses don't struggle with ideas.\n\nThey struggle with:\n\u2022 Leads\n\u2022 Appointments\n\u2022 Conversions\n\nAn AI-powered lead gen system can:\n\u2022 Find prospects automatically\n\u2022 Reach out with personalized messages\n\u2022 Book calls on autopilot\n\nThat's real money.\n\nHere's the math:\n\n100 leads sourced\n20 replies (20% reply rate with AI personalization)\n5 booked calls (25% booking rate)\n2 closed deals (40% close rate)\n$5K per deal = $10K revenue\n\nTime invested: 5 hours to set up the system\nTime per month to manage: 2 hours\n\nThat's $10K for 7 hours of work.\n\nOr $1,428 per hour.\n\nThis is why high-ticket service providers are building these systems. This is why agencies are using them. This is why consultants are scaling with them.\n\nThe system does the work. You close the deals.");
    record6.set("category", "Systems");
    record6.set("featured", false);
    record6.set("tags", ["Systems", "Marketing"]);
    record6.set("related_blueprint_id", "system-04");
    record6.set("related_tool_ids", ["apollo", "instantly", "make"]);
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
    record7.set("title", "Automation Is Useless Without This");
    record7.set("slug", "automation-missing-ingredient");
    record7.set("short_text", "Automation alone doesn't work. You need clean inputs, strong prompts, and defined workflows. Otherwise, you're just automating chaos.");
    record7.set("long_form_content", "Automation alone doesn't work.\n\nYou need:\n\u2022 Clean inputs\n\u2022 Strong prompts\n\u2022 Defined workflows\n\nOtherwise, you're just automating chaos.\n\nHere's what fails:\n\nBad Setup: 'Let me automate my email sending'\nResult: Spam folder. Unsubscribes. Reputation damage.\n\nGood Setup: 'Let me automate my email sending with segmentation, personalization, and tracking'\nResult: Higher open rates. More conversions. Growing list.\n\nThe difference? The system.\n\nAutomation is just the engine. The system is what makes it run right.\n\nBefore you automate anything, ask:\n\u2022 What's my input?\n\u2022 What's my process?\n\u2022 What's my output?\n\u2022 How do I measure success?\n\nAnswer those questions first. Then automate.\n\nOtherwise, you're just automating problems.");
    record7.set("category", "Automation");
    record7.set("featured", false);
    record7.set("tags", ["Automation", "Systems"]);
    record7.set("related_tool_ids", ["make", "zapier", "albato"]);
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
    record8.set("title", "If You're New to AI, Start Here");
    record8.set("slug", "ai-beginner-guide");
    record8.set("short_text", "Don't overcomplicate it. Start with one system, one goal, one workflow. Build it. Then scale it. That's how real builders win.");
    record8.set("long_form_content", "Don't overcomplicate it.\n\nStart with:\n\u2022 One system\n\u2022 One goal\n\u2022 One workflow\n\nBuild it.\n\nThen scale it.\n\nThat's how real builders win.\n\nThe mistake beginners make: They try to build everything at once.\n\nContent system + lead gen system + email system + affiliate system = overwhelm.\n\nBetter approach:\n\nMonth 1: Build ONE system (content creation)\nMonth 2: Scale that system\nMonth 3: Add second system (lead generation)\nMonth 4: Connect them\n\nThis is how you actually make progress.\n\nPick one system. Master it. Then expand.\n\nDon't try to be everywhere. Be excellent at one thing first.\n\nThat's the path to $10K/month. That's the path to $100K/month. That's the path to real income.");
    record8.set("category", "Systems");
    record8.set("featured", false);
    record8.set("tags", ["Systems", "Tutorial"]);
    record8.set("related_blueprint_id", "system-01");
    record8.set("related_tool_ids", ["magai", "creatify", "make"]);
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
    record9.set("title", "We Don't Sell Tools. We Build Systems.");
    record9.set("slug", "our-philosophy-systems-not-tools");
    record9.set("short_text", "Anyone can list tools. We do something different. We test tools, connect them, and build real systems. So you don't have to guess what works.");
    record9.set("long_form_content", "Anyone can list tools.\n\nWe do something different.\n\nWe:\n\u2022 Test tools\n\u2022 Connect them\n\u2022 Build real systems\n\nSo you don't have to guess what works.\n\nHere's the difference:\n\nTool Seller: 'Here are 50 AI tools. Pick one.'\nSystem Builder: 'Here's a system using 5 tools that work together to generate $10K/month.'\n\nOne leaves you confused.\nOne gives you a blueprint.\n\nWe're system builders.\n\nWe don't care about individual tools. We care about systems that work.\n\nA tool is only valuable if it fits into a system.\n\nA system is only valuable if it generates results.\n\nEverything we build is tested, connected, and designed to make money.\n\nThat's our philosophy.\n\nThat's why we're different.\n\nThat's why our systems work.");
    record9.set("category", "Systems");
    record9.set("featured", true);
    record9.set("tags", ["Systems", "AI"]);
    record9.set("related_blueprint_id", "system-01");
    record9.set("related_tool_ids", ["magai", "creatify", "make", "getresponse"]);
  try {
    app.save(record9);
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