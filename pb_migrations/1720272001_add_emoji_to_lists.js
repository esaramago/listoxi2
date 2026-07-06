migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("lists");

  collection.schema.addField(new SchemaField({
    name: "emoji",
    type: "text",
    required: false,
    options: {}
  }));

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("lists");

  collection.schema.removeField("emoji");

  return dao.saveCollection(collection);
});
