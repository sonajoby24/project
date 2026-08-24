export function validateResults(data: any) {

  if (!data) {

    return {

      valid: false,

      confidence: 0,

      reason: "No data returned.",

    };

  }

  const totalRecords =

    (data.products?.length || 0) +

    (data.vendors?.length || 0) +

    (data.quotes?.length || 0) +

    (data.orders?.length || 0) +

    (data.quoteLines?.length || 0) +

    (data.comparison?.length || 0);

  if (totalRecords === 0) {

    return {

      valid: false,

      confidence: 0,

      reason:
        "No matching Firebase records found.",

    };

  }

  return {

    valid: true,

    confidence: 100,

    reason: "Firebase data found.",

  };

}