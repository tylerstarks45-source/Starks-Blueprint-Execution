/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let records;
  try {
    records = app.findRecordsByFilter("blueprints", "name='Funnel & Email Automator'");
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("No records found, skipping");
      return;
    }
    throw e;
  }
  
  for (const record of records) {
    record.set("systemArchitectureImage", "https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/b1c4c1a5ff6f82fe45c3cb26d4a4b5b8.png");
    record.set("systemArchitectureDescription", "This system is structured across multiple layers that work together to convert traffic into revenue automatically. Each layer automates a key part of the sales funnel to convert traffic into leads, nurture them, and drive sales.");
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