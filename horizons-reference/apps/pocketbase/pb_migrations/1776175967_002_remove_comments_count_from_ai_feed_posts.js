/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.removeByName("comments_count");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.add(new NumberField({
    name: "comments_count"
  }));
  return app.save(collection);
})