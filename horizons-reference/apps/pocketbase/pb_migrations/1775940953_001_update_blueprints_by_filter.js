/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let records;
  try {
    records = app.findRecordsByFilter("blueprints", "system_name='System 01' || name='AI Affiliate Content Engine'");
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("No records found, skipping");
      return;
    }
    throw e;
  }
  
  for (const record of records) {
    record.set("systemArchitectureImage", "https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/79e974fe86b59b8e0eb659a345a72dc6.png");
    record.set("systemArchitectureDescription", "This system is structured across multiple layers that work together to turn content into traffic, clicks, and affiliate revenue. Each layer automates a key part of the process to turn content into traffic, clicks, and affiliate revenue.");
    try {
      app.save(record);
    } catch (e) {
      if (e.message.includes("Value must be unique")) {
        console.log("Record with unique value already exists, skipping");
      } else {
        throw e;
      }
    }
  }
}, (app) => {
  // Rollback: original values not stored, manual restore needed
})