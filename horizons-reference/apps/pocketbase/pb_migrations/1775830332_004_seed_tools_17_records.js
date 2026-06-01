/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const record0 = new Record(collection);
    record0.set("name", "QC System");
    record0.set("description", "AI Automation System");
    record0.set("category", "AI Automation");
    record0.set("core_problem", "Businesses waste time doing repetitive manual work");
    record0.set("big_outcome", "Fully automated business systems");
    record0.set("transformation", "Manual work \u2192 automated income system");
    record0.set("target_audience", "Entrepreneurs, agencies");
    record0.set("emotional_trigger", "Frustration");
    record0.set("pain_level", 9);
    record0.set("offer_type", "Software");
    record0.set("affiliate_link", "https://qcsystem.store/?aff=tylerstarks77dca4");
    record0.set("unique_angle", "Replace human work with AI automation");
    record0.set("competition_level", "Medium");
    record0.set("price_perception", "Premium");
    record0.set("trust_level", "Medium");
    record0.set("status", "ACTIVE");
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
    record1.set("name", "AI Profit Course (DS24)");
    record1.set("description", "Learn profitable online systems");
    record1.set("category", "Online Course");
    record1.set("core_problem", "People don't know how to make money online");
    record1.set("big_outcome", "Learn profitable online systems");
    record1.set("transformation", "Confusion \u2192 structured income strategy");
    record1.set("target_audience", "Beginners, side hustlers");
    record1.set("emotional_trigger", "Desire");
    record1.set("pain_level", 8);
    record1.set("offer_type", "Course");
    record1.set("affiliate_link", "https://www.checkout-ds24.com/product/625030?aff=tylerstarks77dca4");
    record1.set("unique_angle", "Proven system for beginners");
    record1.set("competition_level", "High");
    record1.set("price_perception", "Mid");
    record1.set("trust_level", "Medium");
    record1.set("status", "ACTIVE");
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
    record2.set("name", "Remixable AI");
    record2.set("description", "Instant content generation");
    record2.set("category", "AI Content Creation");
    record2.set("core_problem", "Creating content takes too long");
    record2.set("big_outcome", "Instant content generation");
    record2.set("transformation", "Slow creation \u2192 instant output");
    record2.set("target_audience", "Creators, marketers");
    record2.set("emotional_trigger", "Overwhelm");
    record2.set("pain_level", 7);
    record2.set("offer_type", "Software");
    record2.set("affiliate_link", "https://remixable.net/join/?aff=tylerstarks77dca4");
    record2.set("unique_angle", "Remix any content instantly");
    record2.set("competition_level", "Medium");
    record2.set("price_perception", "Mid");
    record2.set("trust_level", "Medium");
    record2.set("status", "ACTIVE");
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
    record3.set("name", "AgentX AI");
    record3.set("description", "Fully automated workflows");
    record3.set("category", "AI Automation");
    record3.set("core_problem", "No automation in business");
    record3.set("big_outcome", "Fully automated workflows");
    record3.set("transformation", "Manual operations \u2192 AI systems");
    record3.set("target_audience", "Business owners");
    record3.set("emotional_trigger", "Frustration");
    record3.set("pain_level", 9);
    record3.set("offer_type", "Software");
    record3.set("affiliate_link", "https://getagentx.com/order#aff=tylerstarks77dca4");
    record3.set("unique_angle", "AI replaces employees");
    record3.set("competition_level", "Medium");
    record3.set("price_perception", "Premium");
    record3.set("trust_level", "Medium");
    record3.set("status", "ACTIVE");
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
    record4.set("name", "FunnelCockpit");
    record4.set("description", "High-converting funnels");
    record4.set("category", "Marketing Tools");
    record4.set("core_problem", "No optimized funnels");
    record4.set("big_outcome", "High-converting funnels");
    record4.set("transformation", "No funnel \u2192 converting funnel system");
    record4.set("target_audience", "Marketers, affiliates");
    record4.set("emotional_trigger", "Urgency");
    record4.set("pain_level", 8);
    record4.set("offer_type", "Software");
    record4.set("affiliate_link", "https://funnelcockpit.com/?aff=tylerstarks77dca4");
    record4.set("unique_angle", "Built for conversions");
    record4.set("competition_level", "High");
    record4.set("price_perception", "Mid");
    record4.set("trust_level", "High");
    record4.set("status", "ACTIVE");
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
    record5.set("name", "KlickTipp");
    record5.set("description", "Automated email profits");
    record5.set("category", "Email Marketing");
    record5.set("core_problem", "Poor email conversions");
    record5.set("big_outcome", "Automated email profits");
    record5.set("transformation", "Manual emails \u2192 smart automation");
    record5.set("target_audience", "Businesses");
    record5.set("emotional_trigger", "Fear");
    record5.set("pain_level", 7);
    record5.set("offer_type", "Software");
    record5.set("affiliate_link", "https://www.klicktipp.com/de/?aff=tylerstarks77dca4");
    record5.set("unique_angle", "Advanced email automation");
    record5.set("competition_level", "High");
    record5.set("price_perception", "Mid");
    record5.set("trust_level", "High");
    record5.set("status", "ACTIVE");
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
    record6.set("name", "Viddeos AI (YES)");
    record6.set("description", "AI-generated videos");
    record6.set("category", "AI Video");
    record6.set("core_problem", "Hard to create videos");
    record6.set("big_outcome", "AI-generated videos");
    record6.set("transformation", "No content \u2192 viral content");
    record6.set("target_audience", "Creators");
    record6.set("emotional_trigger", "Opportunity");
    record6.set("pain_level", 8);
    record6.set("offer_type", "Software");
    record6.set("affiliate_link", "https://viddeos.ai/yes/#aff=tylerstarks77dca4");
    record6.set("unique_angle", "Fully automated video creation");
    record6.set("competition_level", "High");
    record6.set("price_perception", "Mid");
    record6.set("trust_level", "Medium");
    record6.set("status", "ACTIVE");
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
    record7.set("name", "Viddeos AI (START)");
    record7.set("description", "AI-generated videos");
    record7.set("category", "AI Video");
    record7.set("core_problem", "Hard to create videos");
    record7.set("big_outcome", "AI-generated videos");
    record7.set("transformation", "No content \u2192 viral content");
    record7.set("target_audience", "Creators");
    record7.set("emotional_trigger", "Opportunity");
    record7.set("pain_level", 8);
    record7.set("offer_type", "Software");
    record7.set("affiliate_link", "https://viddeos.ai/start/#aff=tylerstarks77dca4");
    record7.set("unique_angle", "Beginner entry version");
    record7.set("competition_level", "High");
    record7.set("price_perception", "Low");
    record7.set("trust_level", "Medium");
    record7.set("status", "ACTIVE");
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
    record8.set("name", "Twin AI");
    record8.set("description", "Build automation systems");
    record8.set("category", "AI Automation Builder");
    record8.set("core_problem", "People can't build systems");
    record8.set("big_outcome", "Build automation systems");
    record8.set("transformation", "No system \u2192 full automation");
    record8.set("target_audience", "Builders, entrepreneurs");
    record8.set("emotional_trigger", "Ambition");
    record8.set("pain_level", 9);
    record8.set("offer_type", "Software");
    record8.set("affiliate_link", "https://twin.so/?via=timothy");
    record8.set("unique_angle", "Build AI systems without coding");
    record8.set("competition_level", "Medium");
    record8.set("price_perception", "Premium");
    record8.set("trust_level", "Medium");
    record8.set("status", "ACTIVE");
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
    record9.set("name", "AI Profit Sniper");
    record9.set("description", "Automated targeted traffic");
    record9.set("category", "AI Marketing");
    record9.set("core_problem", "No targeted traffic");
    record9.set("big_outcome", "Automated targeted traffic");
    record9.set("transformation", "Random traffic \u2192 targeted buyers");
    record9.set("target_audience", "Affiliates");
    record9.set("emotional_trigger", "Desire");
    record9.set("pain_level", 8);
    record9.set("offer_type", "Software");
    record9.set("affiliate_link", "https://www.aiprofitsniper.com/dindex1.html#aff=tylerstarks77dca4");
    record9.set("unique_angle", "AI finds buyers");
    record9.set("competition_level", "Medium");
    record9.set("price_perception", "Mid");
    record9.set("trust_level", "Medium");
    record9.set("status", "ACTIVE");
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
    record10.set("name", "GoHighLevel");
    record10.set("description", "All-in-one system");
    record10.set("category", "CRM / Automation");
    record10.set("core_problem", "Disconnected business tools");
    record10.set("big_outcome", "All-in-one system");
    record10.set("transformation", "Multiple tools \u2192 one platform");
    record10.set("target_audience", "Agencies");
    record10.set("emotional_trigger", "Overwhelm");
    record10.set("pain_level", 9);
    record10.set("offer_type", "Software");
    record10.set("affiliate_link", "https://www.gohighlevel.com/46321b6?fp_ref=t04hj");
    record10.set("unique_angle", "Everything in one system");
    record10.set("competition_level", "High");
    record10.set("price_perception", "Premium");
    record10.set("trust_level", "High");
    record10.set("status", "ACTIVE");
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
    record11.set("name", "CustomGPT");
    record11.set("description", "Custom AI assistants");
    record11.set("category", "AI Chatbot");
    record11.set("core_problem", "No AI support systems");
    record11.set("big_outcome", "Custom AI assistants");
    record11.set("transformation", "No AI \u2192 smart assistant");
    record11.set("target_audience", "Businesses");
    record11.set("emotional_trigger", "Curiosity");
    record11.set("pain_level", 7);
    record11.set("offer_type", "Software");
    record11.set("affiliate_link", "https://customgpt.ai/?fpr=timothy99");
    record11.set("unique_angle", "Train your own AI");
    record11.set("competition_level", "Medium");
    record11.set("price_perception", "Mid");
    record11.set("trust_level", "Medium");
    record11.set("status", "ACTIVE");
  try {
    app.save(record11);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record12 = new Record(collection);
    record12.set("name", "TubeMagic");
    record12.set("description", "Faster YouTube growth");
    record12.set("category", "YouTube Growth");
    record12.set("core_problem", "No video growth");
    record12.set("big_outcome", "Faster YouTube growth");
    record12.set("transformation", "Slow channel \u2192 viral growth");
    record12.set("target_audience", "YouTubers");
    record12.set("emotional_trigger", "Desire");
    record12.set("pain_level", 8);
    record12.set("offer_type", "Software");
    record12.set("affiliate_link", "https://tubemagic.com/ds#aff=tylerstarks77dca4");
    record12.set("unique_angle", "AI YouTube growth system");
    record12.set("competition_level", "High");
    record12.set("price_perception", "Mid");
    record12.set("trust_level", "Medium");
    record12.set("status", "ACTIVE");
  try {
    app.save(record12);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record13 = new Record(collection);
    record13.set("name", "Millionaire Partnership");
    record13.set("description", "Proven online income system");
    record13.set("category", "Online Course");
    record13.set("core_problem", "No business model");
    record13.set("big_outcome", "Proven online income system");
    record13.set("transformation", "No income \u2192 structured income");
    record13.set("target_audience", "Beginners");
    record13.set("emotional_trigger", "Hope");
    record13.set("pain_level", 8);
    record13.set("offer_type", "Course");
    record13.set("affiliate_link", "https://millionairepartnership.com/webclass-d24-new");
    record13.set("unique_angle", "Partnership-based income");
    record13.set("competition_level", "High");
    record13.set("price_perception", "Mid");
    record13.set("trust_level", "Medium");
    record13.set("status", "ACTIVE");
  try {
    app.save(record13);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record14 = new Record(collection);
    record14.set("name", "AlgePrime");
    record14.set("description", "AI trading automation");
    record14.set("category", "Trading AI");
    record14.set("core_problem", "Manual trading losses");
    record14.set("big_outcome", "AI trading automation");
    record14.set("transformation", "Manual trading \u2192 AI trading");
    record14.set("target_audience", "Traders");
    record14.set("emotional_trigger", "Fear");
    record14.set("pain_level", 9);
    record14.set("offer_type", "Software");
    record14.set("affiliate_link", "https://algeprime.com#aff=tylerstarks77dca4");
    record14.set("unique_angle", "AI trading system");
    record14.set("competition_level", "High");
    record14.set("price_perception", "Premium");
    record14.set("trust_level", "Medium");
    record14.set("status", "ACTIVE");
  try {
    app.save(record14);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record15 = new Record(collection);
    record15.set("name", "AI Book Writer");
    record15.set("description", "AI-written books");
    record15.set("category", "AI Writing");
    record15.set("core_problem", "Writing books takes too long");
    record15.set("big_outcome", "AI-written books");
    record15.set("transformation", "Idea \u2192 finished book");
    record15.set("target_audience", "Creators");
    record15.set("emotional_trigger", "Curiosity");
    record15.set("pain_level", 7);
    record15.set("offer_type", "Software");
    record15.set("affiliate_link", "https://www.aibookwriter.de/en?aff=tylerstarks77dca4");
    record15.set("unique_angle", "Full book creation");
    record15.set("competition_level", "Medium");
    record15.set("price_perception", "Mid");
    record15.set("trust_level", "Medium");
    record15.set("status", "ACTIVE");
  try {
    app.save(record15);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record16 = new Record(collection);
    record16.set("name", "Trade Commander");
    record16.set("description", "Automated trade copying");
    record16.set("category", "Trading Tool");
    record16.set("core_problem", "Managing trades manually");
    record16.set("big_outcome", "Automated trade copying");
    record16.set("transformation", "Manual \u2192 automated trading");
    record16.set("target_audience", "Traders");
    record16.set("emotional_trigger", "Fear");
    record16.set("pain_level", 9);
    record16.set("offer_type", "Software");
    record16.set("affiliate_link", "https://trade-commander.com/en/produkt/metatrader-interactivebrokers-order-copier/?aff=tylerstarks77dca4");
    record16.set("unique_angle", "Trade copier automation");
    record16.set("competition_level", "Medium");
    record16.set("price_perception", "Premium");
    record16.set("trust_level", "Medium");
    record16.set("status", "ACTIVE");
  try {
    app.save(record16);
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