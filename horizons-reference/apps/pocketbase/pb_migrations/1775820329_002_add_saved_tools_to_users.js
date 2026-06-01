/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const toolsCollection = app.findCollectionByNameOrId("tools");
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("saved_tools");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("saved_tools"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "saved_tools",
    required: false,
    collectionId: toolsCollection.id,
    maxSelect: 0
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("saved_tools");
  return app.save(collection);
})