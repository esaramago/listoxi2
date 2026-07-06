migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("items");

  const items = [
    { id: "colamadeiraitm1", name: "Cola madeira", details: "", quantity: 1 },
    { id: "tremocomostard2", name: "Tremoço, mostarda e centeio", details: "", quantity: 1 },
    { id: "cadeadoitemthr3", name: "Cadeado 7mm", details: "", quantity: 1 },
    { id: "pratosdevasoit4", name: "Pratos de vaso", details: "Maximo 19cm * 30", quantity: 6 },
    { id: "oleolinhacacru5", name: "Óleo linhaça cru", details: "1L ou menos. Tem de ser cru", quantity: 1 },
    { id: "rodiziosportas6", name: "Rodízios para portas", details: "", quantity: 2 },
    { id: "calhadezincoit7", name: "Calha de zinco", details: "O zinco-titânio é mais duravel do que o aço galvanizado e fica mais bonito, embora seja mais caro", quantity: 1 },
    { id: "tabuastesteira8", name: "Tábuas para testeira", details: "Comprar no Malhou", quantity: 4 },
    { id: "prodantisalitr9", name: "Produto anti salitre", details: "", quantity: 1 },
    { id: "removresinait10", name: "Remover resina corrente", details: "", quantity: 1 },
    { id: "seciltekreabit1", name: "Seciltek Reabilita", details: "Para experimentar", quantity: 1 },
    { id: "batsolar20ah12a", name: "Bateria Solar 20Ah", details: "Green Cell LFPGC12V20AH - Bateria de Lithium (LiFePO4) BMS 12.8V 256Wh 20A", quantity: 1 },
    { id: "ctrlcargapwm13a", name: "Controlador de carga", details: "Controlador de carga solar PWM (3 etapas) com LCD c/ saidas USB - 12/24VDC 30A", quantity: 1 },
    { id: "pesdemesapara14", name: "Pés de mesa", details: "Para fazer uma mesa para os padrões", quantity: 4 }
  ];

  for (const item of items) {
    const record = new Record(collection);
    record.setId(item.id);
    record.set("list", "906pys9wh7lwd8d");
    record.set("name", item.name);
    record.set("quantity", item.quantity);
    record.set("details", item.details);
    record.set("bought", false);
    dao.saveRecord(record);
  }
}, (db) => {
  const dao = new Dao(db);
  const ids = [
    "colamadeiraitm1",
    "tremocomostard2",
    "cadeadoitemthr3",
    "pratosdevasoit4",
    "oleolinhacacru5",
    "rodiziosportas6",
    "calhadezincoit7",
    "tabuastesteira8",
    "prodantisalitr9",
    "removresinait10",
    "seciltekreabit1",
    "batsolar20ah12a",
    "ctrlcargapwm13a",
    "pesdemesapara14"
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
