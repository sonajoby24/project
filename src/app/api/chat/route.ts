import { NextResponse } from 'next/server';

import { runAgent } from '@/lib/ai/agent';

import { verifyAuthToken } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    // Verify Firebase authentication
    const decodedToken = await verifyAuthToken(req);

    if (!decodedToken) {
      return NextResponse.json(
        {
          success: false,
          response: 'Unauthorized. Please log in with a verified email.',
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      message,
      history,
    } = body;

  if (typeof message !== 'string' || !message.trim()) {
  return NextResponse.json(
    {
      success: false,
      response: 'Please enter a message.',
    },
    { status: 400 }
  );
}

    const response = await runAgent(
      message,
      history || []
    );

    return NextResponse.json({
      response,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        response: 'AI agent failed',
      },
      {
        status: 500,
      }
    );

  }
}