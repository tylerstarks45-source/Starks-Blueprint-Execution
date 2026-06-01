/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.indexes.push("CREATE UNIQUE INDEX idx_ai_feed_posts_slug ON ai_feed_posts (slug)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_ai_feed_posts_slug"));
  return app.save(collection);
})