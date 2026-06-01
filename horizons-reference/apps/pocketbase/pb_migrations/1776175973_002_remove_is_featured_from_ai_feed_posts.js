/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.removeByName("is_featured");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.add(new BoolField({
    name: "is_featured"
  }));
  return app.save(collection);
})