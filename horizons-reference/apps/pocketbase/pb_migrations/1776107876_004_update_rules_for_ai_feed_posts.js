/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.listRule = "";
  collection.viewRule = "";
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "author_id = @request.auth.id || @request.auth.role = 'admin'";
  collection.deleteRule = "author_id = @request.auth.id || @request.auth.role = 'admin'";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.listRule = "";
  collection.viewRule = "";
  collection.createRule = "@request.auth.id != \"\"";
  collection.updateRule = "@request.auth.id != \"\"";
  collection.deleteRule = "@request.auth.id != \"\"";
  return app.save(collection);
})