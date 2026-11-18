
import { NextResponse } from 'next/server';
import {
  adminAuth,
  setMfaEnrolledClaim,
} from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const authorization = req.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized.' },
        { status: 401 }
      );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Missing authentication token.' },
        { status: 401 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(token);

    if (decodedToken.email_verified !== true) {
      return NextResponse.json(
        { success: false, message: 'Verified email is required.' },
        { status: 403 }
      );
    }

    // Require a completed SMS MFA sign-in.
if (decodedToken.firebase?.sign_in_second_factor !== 'phone') {
  return NextResponse.json(
    {
      success: false,
      message: 'SMS multi-factor authentication is required.',
    },
    { status: 403 }
  );
}

    if (decodedToken.firebase?.sign_in_second_factor !== 'phone') {
  return NextResponse.json(
    {
      success: false,
      message: 'SMS multi-factor authentication is required.',
    },
    { status: 403 }
  );
}

    await setMfaEnrolledClaim(decodedToken.uid);

    return NextResponse.json({
      success: true,
      message: 'SMS MFA enrollment verified.',
    });
  } catch (error) {
    console.error('MFA enrollment claim error:', error);

    return NextResponse.json(
      { success: false, message: 'Unable to verify MFA enrollment.' },
      { status: 403 }
    );
  }
}
