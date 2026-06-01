/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const blueprintsCollection = app.findCollectionByNameOrId("blueprints");
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("saved_blueprints");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("saved_blueprints"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "saved_blueprints",
    required: false,
    collectionId: blueprintsCollection.id,
    maxSelect: 0
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("saved_blueprints");
  return app.save(collection);
})