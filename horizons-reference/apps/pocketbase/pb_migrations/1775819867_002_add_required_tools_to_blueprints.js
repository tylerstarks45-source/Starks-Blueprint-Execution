/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const toolsCollection = app.findCollectionByNameOrId("tools");
  const collection = app.findCollectionByNameOrId("blueprints");

  const existing = collection.fields.getByName("required_tools");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("required_tools"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "required_tools",
    collectionId: toolsCollection.id,
    maxSelect: 0
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("blueprints");
  collection.fields.removeByName("required_tools");
  return app.save(collection);
})