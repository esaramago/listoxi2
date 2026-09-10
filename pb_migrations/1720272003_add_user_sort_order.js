migrate((db) => {
  const dao = new Dao(db);

  // Add user_sort_order field to lists collection
  const listsCollection = dao.findCollectionByNameOrId("lists");
  
  // Check if user_sort_order field already exists
  const hasUserSortOrder = listsCollection.schema.some(f => f.name === 'user_sort_order');
  
  if (!hasUserSortOrder) {
    listsCollection.schema.push({
      name: "user_sort_order",
      type: "json",
      required: false,
      options: {
        default: {}
      }
    });
    dao.saveCollection(listsCollection);
  }
});
