/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const record0 = new Record(collection);
    record0.set("name", "Pollo AI");
    record0.set("description", "AI-powered content creation platform for generating engaging social media content and marketing materials.");
    record0.set("category", "AI Content Creation");
    record0.set("affiliate_link", "https://pollo.ai?ref=ztbhnmj");
    record0.set("verified_use_case", true);
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
    record1.set("name", "Predis.ai");
    record1.set("description", "AI content creation tool designed for social media marketing and campaign management.");
    record1.set("category", "AI Content Creation");
    record1.set("affiliate_link", "https://predis.ai?ref=timothy97");
    record1.set("verified_use_case", true);
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
    record2.set("name", "Zebracat AI");
    record2.set("description", "AI video creation platform that transforms text and images into professional marketing videos.");
    record2.set("category", "AI Content Creation");
    record2.set("affiliate_link", "http://studio.zebracat.ai/signup/?via=027997");
    record2.set("verified_use_case", true);
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
    record3.set("name", "Viddeos AI");
    record3.set("description", "Automated video creation tool powered by AI for content creators and marketers.");
    record3.set("category", "AI Content Creation");
    record3.set("affiliate_link", "https://viddeos.ai/yes/");
    record3.set("verified_use_case", true);
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
    record4.set("name", "TubeMagic");
    record4.set("description", "AI-driven YouTube optimization and content creation tool for channel growth.");
    record4.set("category", "AI Content Creation");
    record4.set("affiliate_link", "https://tubemagic.com/ds");
    record4.set("verified_use_case", true);
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
    record5.set("name", "AI Book Writer");
    record5.set("description", "Intelligent writing assistant for creating and publishing books with AI-powered content generation.");
    record5.set("category", "AI Content Creation");
    record5.set("affiliate_link", "https://www.aibookwriter.de/en?aff=tylerstarks77dca4");
    record5.set("verified_use_case", true);
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
    record6.set("name", "Make.com");
    record6.set("description", "No-code automation platform for connecting apps and automating business workflows.");
    record6.set("category", "AI Automation");
    record6.set("affiliate_link", "https://www.make.com/en/register?pc=starksglobalgroup");
    record6.set("verified_use_case", true);
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
    record7.set("name", "Albato AI");
    record7.set("description", "Workflow automation platform that integrates multiple apps for seamless business automation.");
    record7.set("category", "AI Automation");
    record7.set("affiliate_link", "https://albato.com?fpr=timothy81");
    record7.set("verified_use_case", true);
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
    record8.set("name", "Relay.app");
    record8.set("description", "Automation platform for connecting apps and automating repetitive business tasks.");
    record8.set("category", "AI Automation");
    record8.set("affiliate_link", "https://relay.app/?via=timothy");
    record8.set("verified_use_case", true);
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
    record9.set("name", "Magai");
    record9.set("description", "AI automation and workflow management tool for streamlining business operations.");
    record9.set("category", "AI Automation");
    record9.set("affiliate_link", "https://magai.co/?via=timothy-starks");
    record9.set("verified_use_case", true);
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
    record10.set("description", "All-in-one marketing platform with email, funnels, CRM, and automation capabilities.");
    record10.set("category", "Funnel & Email Tools");
    record10.set("affiliate_link", "https://www.gohighlevel.com/?fp_ref=t04hj");
    record10.set("verified_use_case", true);
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
    record11.set("name", "GetResponse");
    record11.set("description", "Email marketing and funnel building platform with automation and sales tools.");
    record11.set("category", "Funnel & Email Tools");
    record11.set("affiliate_link", "https://try.getresponsetoday.com/0b323twnmh5c");
    record11.set("verified_use_case", true);
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
    record12.set("name", "KlickTipp");
    record12.set("description", "German-based email marketing and funnel platform with advanced automation features.");
    record12.set("category", "Funnel & Email Tools");
    record12.set("affiliate_link", "https://www.klicktipp.com/de/?aff=tylerstarks77dca4");
    record12.set("verified_use_case", true);
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
    record13.set("name", "Perspective Funnels");
    record13.set("description", "Sales funnel builder with email marketing and conversion optimization tools.");
    record13.set("category", "Funnel & Email Tools");
    record13.set("affiliate_link", "https://www.perspective.co/?lang=en&partnerKey=bd9984bc8fd2&pscd=try.perspective.co");
    record13.set("verified_use_case", true);
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
    record14.set("name", "ClickFunnels AI");
    record14.set("description", "AI-enhanced sales funnel platform for creating high-converting marketing funnels.");
    record14.set("category", "Funnel & Email Tools");
    record14.set("affiliate_link", "https://www.clickfunnels.com/signup-flow?aff=66821e69515f2c10e8ecf0e2aa6249e202c19d4cd4106dbbc85c2c6035e10132");
    record14.set("verified_use_case", true);
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
    record15.set("name", "Systeme.io");
    record15.set("description", "All-in-one platform for email marketing, sales funnels, and online course hosting.");
    record15.set("category", "Funnel & Email Tools");
    record15.set("affiliate_link", "https://systeme.io/?sa=sa026857083720e8c1ed65e04111213cb70aebc598");
    record15.set("verified_use_case", true);
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
    record16.set("name", "SEO Engine");
    record16.set("description", "AI-powered SEO tool for optimizing content and improving search engine rankings.");
    record16.set("category", "Marketing Tools");
    record16.set("affiliate_link", "https://seoengine.ai?atp=zfhp5I");
    record16.set("verified_use_case", true);
  try {
    app.save(record16);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record17 = new Record(collection);
    record17.set("name", "FastSEOHub");
    record17.set("description", "SEO optimization platform with AI-driven tools for traffic generation and ranking improvement.");
    record17.set("category", "Marketing Tools");
    record17.set("affiliate_link", "https://fastseohub.com/digistore24#aff=tylerstarks77dca4");
    record17.set("verified_use_case", true);
  try {
    app.save(record17);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record18 = new Record(collection);
    record18.set("name", "CustomGPT");
    record18.set("description", "AI tool for creating custom GPT models and intelligent chatbots for business applications.");
    record18.set("category", "AI Software");
    record18.set("affiliate_link", "https://customgpt.ai/?fpr=timothy99");
    record18.set("verified_use_case", true);
  try {
    app.save(record18);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record19 = new Record(collection);
    record19.set("name", "Twin AI");
    record19.set("description", "AI-powered personal assistant and automation tool for productivity and business tasks.");
    record19.set("category", "AI Software");
    record19.set("affiliate_link", "https://twin.so/?via=timothy");
    record19.set("verified_use_case", true);
  try {
    app.save(record19);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record20 = new Record(collection);
    record20.set("name", "AgentX");
    record20.set("description", "AI agent platform for automating complex business processes and customer interactions.");
    record20.set("category", "AI Software");
    record20.set("affiliate_link", "https://getagentx.com/order#aff=tylerstarks77dca4");
    record20.set("verified_use_case", true);
  try {
    app.save(record20);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record21 = new Record(collection);
    record21.set("name", "BabyLoveGrowth");
    record21.set("description", "AI-powered growth tool for parenting and child development guidance.");
    record21.set("category", "AI Software");
    record21.set("affiliate_link", "https://babylovegrowth.ai/?via=tyler-starks");
    record21.set("verified_use_case", true);
  try {
    app.save(record21);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record22 = new Record(collection);
    record22.set("name", "Remixable");
    record22.set("description", "Business system platform for creating and managing digital products and services.");
    record22.set("category", "Automation Systems");
    record22.set("affiliate_link", "https://remixable.net/join/?aff=tylerstarks77dca4");
    record22.set("verified_use_case", true);
  try {
    app.save(record22);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record23 = new Record(collection);
    record23.set("name", "Digimember");
    record23.set("description", "Membership and digital product platform for managing online courses and exclusive content.");
    record23.set("category", "Automation Systems");
    record23.set("affiliate_link", "https://digimember.com/?aff=tylerstarks77dca4");
    record23.set("verified_use_case", true);
  try {
    app.save(record23);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record24 = new Record(collection);
    record24.set("name", "AlgePrime");
    record24.set("description", "Business automation system for streamlining operations and improving efficiency.");
    record24.set("category", "Automation Systems");
    record24.set("affiliate_link", "https://algeprime.com#aff=tylerstarks77dca4");
    record24.set("verified_use_case", true);
  try {
    app.save(record24);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record25 = new Record(collection);
    record25.set("name", "QC System");
    record25.set("description", "Quality control and business management system for optimizing operations.");
    record25.set("category", "Automation Systems");
    record25.set("affiliate_link", "https://qcsystem.store/?aff=tylerstarks77dca4");
    record25.set("verified_use_case", true);
  try {
    app.save(record25);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record26 = new Record(collection);
    record26.set("name", "FunnelCockpit");
    record26.set("description", "Sales funnel management and analytics platform for tracking and optimizing conversions.");
    record26.set("category", "Automation Systems");
    record26.set("affiliate_link", "https://funnelcockpit.com/?aff=tylerstarks77dca4");
    record26.set("verified_use_case", true);
  try {
    app.save(record26);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record27 = new Record(collection);
    record27.set("name", "AI Profit Sniper");
    record27.set("description", "AI-powered profit optimization system for identifying and capitalizing on business opportunities.");
    record27.set("category", "Automation Systems");
    record27.set("affiliate_link", "https://www.aiprofitsniper.com/dindex1.html");
    record27.set("verified_use_case", true);
  try {
    app.save(record27);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record28 = new Record(collection);
    record28.set("name", "Trade Commander");
    record28.set("description", "Trading automation system for managing and executing trades with advanced order management.");
    record28.set("category", "Automation Systems");
    record28.set("affiliate_link", "https://trade-commander.com/en/produkt/metatrader-interactivebrokers-order-copier/?aff=tylerstarks77dca4");
    record28.set("verified_use_case", true);
  try {
    app.save(record28);
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