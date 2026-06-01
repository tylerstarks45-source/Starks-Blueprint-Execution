/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_likes");
  collection.listRule = "post_id != ''";
  collection.viewRule = "post_id != ''";
  collection.createRule = "@request.auth.id != \"\"";
  collection.deleteRule = "user_id = @request.auth.id";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_likes");
  collection.listRule = "post_id != ''";
  collection.viewRule = "post_id != ''";
  collection.createRule = "@request.auth.id != ''";
  collection.deleteRule = "user_id = @request.auth.id";
  return app.save(collection);
})