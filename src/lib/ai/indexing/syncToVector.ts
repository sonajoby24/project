import { syncProducts } from "./productIndexer";

import { syncQuotes } from "./quoteIndexer";

import { syncVendors } from "./vendorIndexer";

export async function syncEverything() {

    console.log("Starting Vector Sync");

    await syncProducts();

    await syncVendors();

    await syncQuotes();

    console.log("Vector Sync Finished");

}