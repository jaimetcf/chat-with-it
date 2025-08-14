import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual upload to Firebase Storage
    // For now, just return success
    console.log('File upload:', {
      name: file.name,
      size: file.size,
      type: file.type,
      userId,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'File uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
