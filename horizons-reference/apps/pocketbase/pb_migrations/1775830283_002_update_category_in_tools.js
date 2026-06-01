/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");
  const field = collection.fields.getByName("category");
  field.values = ["AI Software", "Funnel & Email Tools", "Website Builders", "Automation Systems", "Sales & Outreach", "Data & Intelligence", "AI Automation", "Online Course", "AI Content Creation", "Marketing Tools", "Email Marketing", "AI Video", "AI Automation Builder", "AI Marketing", "CRM / Automation", "AI Chatbot", "YouTube Growth", "Trading AI", "AI Writing", "Trading Tool"];
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  const field = collection.fields.getByName("category");
  field.values = ["AI Software", "Funnel & Email Tools", "Website Builders", "Automation Systems", "Sales & Outreach", "Data & Intelligence"];
  return app.save(collection);
})