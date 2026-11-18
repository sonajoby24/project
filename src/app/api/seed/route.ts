
import { NextResponse } from "next/server";
import { seedFirestore } from "@/lib/seedData";
import { verifyAuthToken } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  try {
    // Require verified email and completed SMS MFA.
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

   const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const userEmail = decodedToken.email?.toLowerCase();

if (!adminEmail || userEmail !== adminEmail) {
  return NextResponse.json(
    { success: false, message: "Administrator access required." },
    { status: 403 }
  );
}

await seedFirestore();

    return NextResponse.json({
      success: true,
      message: "Data seeded successfully",
    });
  } catch (error) {
    console.error("SEED ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Seeding failed" },
      { status: 500 }
    );
  }
}
