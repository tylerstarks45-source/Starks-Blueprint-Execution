/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.removeByName("poll_options");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.add(new JSONField({
    name: "poll_options"
  }));
  return app.save(collection);
})