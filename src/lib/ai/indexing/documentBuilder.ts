export interface VectorDocument {

    id: string;

    text: string;

    metadata: {

        type: string;

        firestoreId: string;

        quoteNumber?: string;

        quoteId?: string;

    };

}

export function buildProductDocument(product: any): VectorDocument {

    return {

        id: product.id,

        text: `
Product Name: ${product.name ?? ""}
Brand: ${product.brand ?? ""}
Category: ${product.category ?? ""}
Vendor: ${product.Vendor ?? ""}
Part Name: ${product["part name"] ?? ""}
Part Id: ${product["part id"] ?? ""}
Colour: ${product.Colour ?? ""}
Status: ${product.status ?? ""}
`,

        metadata: {

            type: "product",

            firestoreId: product.id

        }

    };

}

export function buildVendorDocument(vendor: any): VectorDocument {

    return {

        id: vendor.id,

        text: `
Vendor Name: ${vendor.Name ?? ""}
Email: ${vendor.Email ?? ""}
Phone: ${vendor.Phone ?? ""}
Status: ${vendor.Status ?? ""}
Account Id: ${vendor.AccountId ?? ""}
`,

        metadata: {

            type: "vendor",

            firestoreId: vendor.id

        }

    };

}

export function buildQuoteLineDocument(
    quote: any,
    line: any
): VectorDocument {

    const info =
        quote.QuoteInfo?.[0];

    return {

        id:
            `${info?.QuoteId}_${line.ProductName}_${line.specValue}`,

        text: `
Quote Number: ${info?.QuoteNumber}

Quote Type: ${info?.QuoteType}

Vendor: ${info?.VendorName}

Product: ${line.ProductName}

Specification: ${line.specValue}

Quantity: ${line.Quantity}

Unit Price: ${line.UnitPrice}

Target Price: ${line.TargetPrice}
`,

        metadata: {

            type: "quoteLine",

            firestoreId: quote.id,

            quoteNumber: info?.QuoteNumber,

            quoteId: info?.QuoteId

        }

    };

}