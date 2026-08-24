export function normalizeField(field: string): string {
  const map: Record<string, string> = {
    quoteid: "Quote ID",
    quotenumber: "Quote Number",
    quotetype: "Quote Type",

    productname: "Product Name",

    specvalue: "Specification",
    specification: "Specification",

    quantity: "Quantity",

    unitprice: "Unit Price",
    targetprice: "Target Price",

    accountid: "Account ID",
"account id": "Account ID",
id: "id",

    vendor: "Vendor Name",
    vendorname: "Vendor Name",

    email: "Email",
    phone: "Phone",
    status: "Status",

    rating: "Rating",
    deliverydays: "Delivery Days",
  };

  return (
    map[field.toLowerCase()] ??
    field
  );
}