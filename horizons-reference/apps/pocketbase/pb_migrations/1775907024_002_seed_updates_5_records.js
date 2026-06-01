/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("updates");

  const record0 = new Record(collection);
    record0.set("title", "New AI Automation Tool Added");
    record0.set("description", "Explore our latest AI automation capabilities");
    record0.set("update_type", "New Tool");
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
    record1.set("title", "Content Traffic Sales System Released");
    record1.set("description", "Complete system for content-driven sales funnels");
    record1.set("update_type", "New System");
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
    record2.set("title", "Platform Performance Improvements");
    record2.set("description", "Faster load times and improved stability");
    record2.set("update_type", "Platform Change");
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
    record3.set("title", "AI Agency System Blueprint Available");
    record3.set("description", "Full blueprint for building AI-powered agencies");
    record3.set("update_type", "New System");
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
    record4.set("title", "Email Marketing Integration");
    record4.set("description", "Connect your email tools directly to your stack");
    record4.set("update_type", "New Tool");
  try {
    app.save(record4);
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