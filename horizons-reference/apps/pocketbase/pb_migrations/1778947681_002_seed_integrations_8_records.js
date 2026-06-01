/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("integrations");

  const record0 = new Record(collection);
    record0.set("name", "OpenRouter");
    record0.set("type", "api");
    record0.set("category", "AI");
    record0.set("description", "AI model routing and API aggregation");
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
    record1.set("name", "Gmail");
    record1.set("type", "oauth");
    record1.set("category", "Email");
    record1.set("description", "Email integration for sending and receiving messages");
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
    record2.set("name", "TikTok");
    record2.set("type", "oauth");
    record2.set("category", "Social");
    record2.set("description", "TikTok social media integration");
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
    record3.set("name", "Shopify");
    record3.set("type", "oauth");
    record3.set("category", "E-commerce");
    record3.set("description", "E-commerce platform integration");
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
    record4.set("name", "Stripe");
    record4.set("type", "oauth");
    record4.set("category", "Payments");
    record4.set("description", "Payment processing and billing");
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
    record5.set("name", "YouTube");
    record5.set("type", "oauth");
    record5.set("category", "Video");
    record5.set("description", "YouTube video platform integration");
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
    record6.set("name", "Instagram");
    record6.set("type", "oauth");
    record6.set("category", "Social");
    record6.set("description", "Instagram social media integration");
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
    record7.set("name", "Pictory");
    record7.set("type", "api");
    record7.set("category", "Video");
    record7.set("description", "AI video creation and editing");
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