/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const toolsCollection = app.findCollectionByNameOrId("tools");
  const collection = app.findCollectionByNameOrId("blueprints");

  const existing = collection.fields.getByName("tools_required");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("tools_required"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "tools_required",
    required: false,
    collectionId: toolsCollection.id,
    maxSelect: 0
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("blueprints");
    collection.fields.removeByName("tools_required");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})