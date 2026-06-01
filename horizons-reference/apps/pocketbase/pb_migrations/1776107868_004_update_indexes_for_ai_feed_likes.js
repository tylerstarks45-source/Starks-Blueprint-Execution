/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_likes");
  collection.indexes.push("CREATE UNIQUE INDEX idx_ai_feed_likes_post_user ON ai_feed_likes (post_id, user_id)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_likes");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_ai_feed_likes_post_user"));
  return app.save(collection);
})