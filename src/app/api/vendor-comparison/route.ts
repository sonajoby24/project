import { NextResponse } from "next/server";
import { adminDb, verifyAuthToken } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
        const decodedToken = await verifyAuthToken(req);

    if (!decodedToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please complete SMS verification.",
        },
        { status: 401 }
      );
    }
    const { parentQuoteId } =
      await req.json();

    const snapshot =
      await adminDb
        .collection("quotes")
        .get();

    const vendorQuotes: any[] = [];

    snapshot.forEach((doc) => {
      const quote =
        doc.data();

      const info =
        quote?.QuoteInfo?.[0];

      if (
        info?.ParentQuoteID ===
        parentQuoteId
      ) {
        vendorQuotes.push({
          vendor:
            info.VendorName,
          quoteNumber:
            info.QuoteNumber,
          products:
            info.Qlines || [],
        });
      }
    });

    const comparison =
      vendorQuotes.map((vendor) => {
        let totalAmount = 0;

        vendor.products.forEach(
          (item: any) => {
            totalAmount +=
              Number(item.UnitPrice || 0) *
              Number(item.Quantity || 0);
          }
        );

        return {
          vendor:
            vendor.vendor,

          quoteNumber:
            vendor.quoteNumber,

          productsCovered:
            vendor.products.length,

          totalAmount:
            Number(
              totalAmount.toFixed(2)
            ),
        };
      });

    comparison.sort(
      (a, b) =>
        a.totalAmount -
        b.totalAmount
    );

    const bestVendor =
      comparison[0];

    return NextResponse.json({
      success: true,
      bestVendor,
      comparison,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Vendor comparison failed",
      },
      {
        status: 500,
      }
    );
  }
}