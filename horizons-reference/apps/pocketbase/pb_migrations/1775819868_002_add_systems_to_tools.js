/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const blueprintsCollection = app.findCollectionByNameOrId("blueprints");
  const collection = app.findCollectionByNameOrId("tools");

  const existing = collection.fields.getByName("systems");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("systems"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "systems",
    collectionId: blueprintsCollection.id,
    maxSelect: 0
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.fields.removeByName("systems");
  return app.save(collection);
})