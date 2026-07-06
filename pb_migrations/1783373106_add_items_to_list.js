migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("items");

  const items = [
    { id: "aguacomgasitem1", name: "Água com gás", details: "", quantity: 1 },
    { id: "cervejasemalco1", name: "Cerveja sem álcool", details: "", quantity: 1 },
    { id: "palitoslareine3", name: "Palitos lá reine", details: "Ou bolacha maria", quantity: 1 },
    { id: "papelhigienico4", name: "Papel higiénico", details: "", quantity: 1 },
    { id: "leitemeiogordo5", name: "Leite", details: "Meio gordo", quantity: 1 },
    { id: "borrachaslimpa6", name: "Borrachas limpa para brisas", details: "", quantity: 1 },
    { id: "recargadeterge7", name: "Recarga detergente louça", details: "", quantity: 1 }
  ];

  for (const item of items) {
    const record = new Record(collection);
    record.setId(item.id);
    record.set("list", "iqclhihhdykod7n");
    record.set("name", item.name);
    record.set("quantity", item.quantity);
    record.set("details", item.details);
    record.set("bought", false);
    dao.saveRecord(record);
  }
}, (db) => {
  const dao = new Dao(db);
  const ids = [
    "aguacomgasitem1",
    "cervejasemalco1",
    "palitoslareine3",
    "papelhigienico4",
    "leitemeiogordo5",
    "borrachaslimpa6",
    "recargadeterge7"
  ];

  for (const id of ids) {
    try {
      const record = dao.findRecordById("items", id);
      dao.deleteRecord(record);
    } catch (e) {
      // ignorar se não encontrar
    }
  }
});
