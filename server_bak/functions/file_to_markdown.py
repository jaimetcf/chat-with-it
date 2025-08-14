from pdf_to_markdown import pdf_to_markdown
from image_to_description import image_to_description


def file_to_markdown(bucket_name: str, file_path: str, user_id: str, file_type: str) -> str:
    """
    Convert file to markdown content based on file type.
    
    Args:
        bucket_name: Name of the Firebase Storage bucket
        file_path: Path to the file in storage
        user_id: User ID for logging purposes
        file_type: Type of file ('PDF', 'IMAGE', or 'UNSUPPORTED')
        
    Returns:
        str: Extracted markdown content from the file
    """
    # Step 1: Text extraction based on file type
    print(f"Converting file to markdown content based on file type: {file_type}")
    if file_type == 'PDF':
        extracted_content = pdf_to_markdown(bucket_name, file_path, user_id)
    elif file_type == 'IMAGE':
        extracted_content = image_to_description(bucket_name, file_path, user_id)
    else:
        print(f"Unsupported file type: {file_type}")
        raise ValueError(f"Unsupported file type: {file_type}")
    
    print(f"Extracted content length: {len(extracted_content)} characters")
    print(f"Content preview: {extracted_content[:200]}...")
    
    return extracted_content
