
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized");
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

/**
 * Verify Firebase ID token from the request.
 * Rejects unauthenticated users and users with unverified emails.
 */
async function verifyAuthToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (decodedToken.email_verified !== true) {
      return null;
    }

    return decodedToken;
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    return null;
  }
}

export { adminDb, adminAuth, verifyAuthToken };
