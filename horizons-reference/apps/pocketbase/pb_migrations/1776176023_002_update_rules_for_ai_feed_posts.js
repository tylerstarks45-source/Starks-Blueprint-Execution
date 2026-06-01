/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.createRule = "@request.auth.role = \"admin\"";
  collection.updateRule = "@request.auth.role = \"admin\"";
  collection.deleteRule = "@request.auth.role = \"admin\"";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.createRule = "@request.auth.role = \"admin\"";
  collection.updateRule = "@request.auth.role = \"admin\"";
  collection.deleteRule = "@request.auth.role = \"admin\"";
  return app.save(collection);
})