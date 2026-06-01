/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.listRule = "";
  collection.viewRule = "";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.listRule = "";
  collection.viewRule = "";
  return app.save(collection);
})