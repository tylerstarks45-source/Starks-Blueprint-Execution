/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const record0 = new Record(collection);
    record0.set("name", "SEOEngine AI");
    record0.set("description", "Automates SEO content creation, optimizes articles for ranking, and helps generate organic traffic using AI");
    record0.set("category", "AI Software");
    record0.set("affiliate_link", "https://seoengine.ai?atp=zfhp5I");
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
    record1.set("name", "Magai");
    record1.set("description", "Access to multiple AI models in one place. Content generation, workflows, and business AI assistant.");
    record1.set("category", "AI Software");
    record1.set("affiliate_link", "https://magai.co/?via=timothy-starks");
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
    record2.set("name", "Albato");
    record2.set("description", "Connects apps together, automates workflows, no-code automation builder. Zapier alternative.");
    record2.set("category", "Automation Systems");
    record2.set("affiliate_link", "https://albato.com?fpr=timothy81");
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
    record3.set("name", "Zebracat AI");
    record3.set("description", "Turns scripts into videos, AI-generated content for social media, designed for viral content creation");
    record3.set("category", "AI Video");
    record3.set("affiliate_link", "http://studio.zebracat.ai/signup/?via=027997");
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
    record4.set("name", "Make.com");
    record4.set("description", "Visual automation builder, connects multiple tools, runs full backend systems");
    record4.set("category", "Automation Systems");
    record4.set("affiliate_link", "https://www.make.com/en/register?pc=starksglobalgroup");
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
    record5.set("name", "GODII AI");
    record5.set("description", "AI-powered automation system, trend discovery and research, helps optimize content and marketing decisions");
    record5.set("category", "AI Software");
    record5.set("affiliate_link", "https://gobii.ai/?via=timothy");
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
    record6.set("name", "ClickFunnels AI");
    record6.set("description", "Builds landing pages and funnels, AI-powered marketing tools, converts traffic into sales");
    record6.set("category", "Funnel & Email Tools");
    record6.set("affiliate_link", "https://www.clickfunnels.com/signup-flow?aff=66821e69515f2c10e8ecf0e2aa6249e202c19d4cd4106dbbc85c2c6035e10132");
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
    record7.set("name", "Systeme.io");
    record7.set("description", "Website and funnel builder, email automation, course and product hosting");
    record7.set("category", "Funnel & Email Tools");
    record7.set("affiliate_link", "https://systeme.io/?sa=sa026857083720e8c1ed65e04111213cb70aebc598");
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
}, (app) => {
  // Rollback: record IDs not known, manual cleanup needed
})