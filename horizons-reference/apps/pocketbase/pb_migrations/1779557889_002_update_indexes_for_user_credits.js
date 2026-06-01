/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("user_credits");
  collection.indexes.push("CREATE UNIQUE INDEX idx_user_credits_userId ON user_credits (userId)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("user_credits");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_user_credits_userId"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})