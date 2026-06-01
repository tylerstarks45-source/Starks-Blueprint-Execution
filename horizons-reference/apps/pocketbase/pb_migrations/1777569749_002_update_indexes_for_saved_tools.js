/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("saved_tools");
  collection.indexes.push("CREATE UNIQUE INDEX idx_saved_tools_userId_toolId ON saved_tools (userId, toolId)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("saved_tools");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_saved_tools_userId_toolId"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})