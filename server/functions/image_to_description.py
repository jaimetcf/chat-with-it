import os
import tempfile
from google.cloud import storage
import openai


def image_to_description(bucket_name: str, file_path: str, user_id: str) -> str:
    """
    Extract text and generate description from image using OpenAI GPT-4 Vision.
    
    Args:
        bucket_name: Name of the Firebase Storage bucket
        file_path: Path to the image file in storage
        user_id: User ID for logging purposes
        
    Returns:
        str: Image description and extracted text in markdown format
    """
    print(f"Starting image text extraction for user {user_id}")
    
    try:
        # Initialize OpenAI client
        # You'll need to set OPENAI_API_KEY environment variable
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        
        # Download the image from Firebase Storage
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(file_path)
        
        # Download to temporary file
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            blob.download_to_filename(temp_file.name)
            temp_file_path = temp_file.name
        
        # Read the file into memory
        with open(temp_file_path, "rb") as file:
            image_content = file.read()
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        # Prepare the OpenAI API request
        response = openai.ChatCompletion.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Please analyze this image and provide a comprehensive description in markdown format. Include:
1. A detailed description of what you see in the image
2. Any text content visible in the image (OCR)
3. Any charts, graphs, or data visualizations
4. The overall context and purpose of the image

Format your response in clean markdown with appropriate headings and structure."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_content.hex()}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        
        # Extract the response content
        markdown_content = response.choices[0].message.content
        
        print(f"Image extraction completed. Content length: {len(markdown_content)} characters")
        return markdown_content
        
    except Exception as e:
        print(f"Error extracting text from image: {str(e)}")
        raise e
