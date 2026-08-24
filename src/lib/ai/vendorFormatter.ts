export function formatVendors(
  vendors: any[],
  nlu?: any
): string {

  let answer = "";

  const fields =
    (nlu?.fields || []).map((f: string) =>
      f.toLowerCase()
    );

  const showAll =
    fields.length === 0 ||
    fields.includes("*");

  vendors.forEach((v: any) => {

    answer += "\n";

    // Always show vendor name
    answer +=
      `Vendor Name : ${v.Name || v.vendorName || v.Vendor || "Not Available"}\n`;

    if (showAll || fields.includes("accountid")) {
      answer +=
        `Account ID : ${v.AccountId || "Not Available"}\n`;
    }

    if (showAll || fields.includes("email")) {
      answer +=
        `Email : ${v.Email || "Not Available"}\n`;
    }

    if (showAll || fields.includes("phone")) {
      answer +=
        `Phone : ${v.Phone || "Not Available"}\n`;
    }

    if (showAll || fields.includes("status")) {
      answer +=
        `Status : ${v.Status || "Not Available"}\n`;
    }

    if (showAll || fields.includes("rating")) {
      answer +=
        `Rating : ${v.rating || "Not Available"}\n`;
    }

    if (showAll || fields.includes("deliverydays")) {
      answer +=
        `Delivery Days : ${v.deliveryDays || "Not Available"}\n`;
    }

    answer +=
      "\n----------------------------------------\n";

  });

  return answer.trim();
}