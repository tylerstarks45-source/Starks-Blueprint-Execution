/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.removeByName("author_id");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.add(new TextField({
    name: "author_id",
    required: true
  }));
  return app.save(collection);
})