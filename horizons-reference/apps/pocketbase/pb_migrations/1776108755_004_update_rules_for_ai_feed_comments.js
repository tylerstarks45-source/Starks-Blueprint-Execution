/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_comments");
  collection.listRule = "post_id != ''";
  collection.viewRule = "post_id != ''";
  collection.createRule = "@request.auth.id != \"\"";
  collection.updateRule = "author_id = @request.auth.id";
  collection.deleteRule = "author_id = @request.auth.id";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_comments");
  collection.listRule = "post_id != ''";
  collection.viewRule = "post_id != ''";
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "author_id = @request.auth.id";
  collection.deleteRule = "author_id = @request.auth.id";
  return app.save(collection);
})