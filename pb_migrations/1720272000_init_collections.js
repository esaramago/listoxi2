migrate((db) => {
  const dao = new Dao(db);

  // 1. Update rules for the system 'users' collection to enable creation by authenticated users (invitations)
  const usersCollection = dao.findCollectionByNameOrId("users");
  usersCollection.listRule = "@request.auth.id != \"\"";
  usersCollection.viewRule = "@request.auth.id != \"\"";
  usersCollection.createRule = "@request.auth.id != \"\"";
  dao.saveCollection(usersCollection);

  // 2. Create 'lists' collection
  const listsCollection = new Collection({
    name: "lists",
    type: "base",
    listRule: "owner = @request.auth.id || shared_with.id ?= @request.auth.id",
    viewRule: "owner = @request.auth.id || shared_with.id ?= @request.auth.id",
    createRule: "owner = @request.auth.id",
    updateRule: "owner = @request.auth.id || shared_with.id ?= @request.auth.id",
    deleteRule: "owner = @request.auth.id",
    schema: [
      {
        name: "name",
        type: "text",
        required: true,
        options: {}
      },
      {
        name: "owner",
        type: "relation",
        required: true,
        options: {
          collectionId: "users",
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: []
        }
      },
      {
        name: "shared_with",
        type: "relation",
        required: false,
        options: {
          collectionId: "users",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: null,
          displayFields: []
        }
      }
    ]
  });
  dao.saveCollection(listsCollection);

  // 3. Create 'items' collection
  const itemsCollection = new Collection({
    name: "items",
    type: "base",
    listRule: "list.owner = @request.auth.id || list.shared_with.id ?= @request.auth.id",
    viewRule: "list.owner = @request.auth.id || list.shared_with.id ?= @request.auth.id",
    createRule: "@request.auth.id != \"\"",
    updateRule: "list.owner = @request.auth.id || list.shared_with.id ?= @request.auth.id",
    deleteRule: "list.owner = @request.auth.id || list.shared_with.id ?= @request.auth.id",
    schema: [
      {
        name: "list",
        type: "relation",
        required: true,
        options: {
          collectionId: "lists",
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: []
        }
      },
      {
        name: "name",
        type: "text",
        required: true,
        options: {}
      },
      {
        name: "quantity",
        type: "number",
        required: true,
        options: {
          min: 1,
          max: null,
          noDecimal: true
        }
      },
      {
        name: "details",
        type: "text",
        required: false,
        options: {}
      },
      {
        name: "bought",
        type: "bool",
        required: false,
        options: {}
      }
    ]
  });
  dao.saveCollection(itemsCollection);
});
