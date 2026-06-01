/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("saved_systems");

  const existing = collection.fields.getByName("savedTo");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("savedTo"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "savedTo",
    required: false,
    values: ["Dashboard", "My Stack", "Saved Systems"]
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("saved_systems");
    collection.fields.removeByName("savedTo");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})