import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual call to Google Cloud Function
    // For now, return a mock response
    const mockResponse = `This is a mock response to: "${message}". In the real implementation, this will be replaced with a call to the Google Cloud Function that processes the message using the AI agent and retrieves relevant context from the vector database.`;

    return NextResponse.json({ response: mockResponse });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
