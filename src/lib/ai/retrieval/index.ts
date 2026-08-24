/* Enterprise Retrieval Orchestrator */

import { retrieveProducts } from "./product";
import { retrieveQuotes } from "./quote";
import { retrieveVendors } from "./vendor";
import { retrieveOrders } from "./order";
import { retrieveQuoteLineProducts } from "./quoteLine";
import { retrieveSummary } from "./summary";

export async function retrieveFromFirestore(
    query:string,
    plan:any
){

  const intent = plan.intent;

 const entities = plan.entities;

  console.log("Detected Intent:", intent);
  console.log("NLU Entities:", entities);

 const result: any = {
  intent,
  entities,
  products: [],
  vendors: [],
  quotes: [],
  orders: [],
  reports: [],
  quoteLines: [],
  comparison: []
};
  for (const collection of (plan.collections ?? [])) {

  switch (collection) {

    case "Product":

      result.products =
        await retrieveProducts(query, entities);

      break;

    case "QuoteLine": {

      const quoteLines =
 await retrieveQuoteLineProducts(
    entities.product ?? "",
    plan.fields
  );

      result.quoteLines =
        quoteLines.products ?? [];

      break;
    }

    case "Quote":

      Object.assign(
        result,
        await retrieveQuotes(query)
      );

      break;

    case "Vendor":

      Object.assign(
        result,
        await retrieveVendors(query, plan)
      );

      break;

    case "Order":

      Object.assign(
        result,
        await retrieveOrders(query)
      );

      break;

    case "Report":

      Object.assign(
        result,
        await retrieveSummary(query)
      );

      break;
  }
}
  console.log("RETRIEVAL RESULT");
console.log(JSON.stringify(result, null, 2));

  return result;

}