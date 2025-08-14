import os
import tempfile
from google.cloud import documentai
from google.cloud import storage


def pdf_to_markdown(bucket_name: str, file_path: str, user_id: str) -> str:
    """
    Extract text from PDF using Google Cloud Document AI and convert to markdown.
    
    Args:
        bucket_name: Name of the Firebase Storage bucket
        file_path: Path to the PDF file in storage
        user_id: User ID for logging purposes
        
    Returns:
        str: Extracted text content in markdown format
    """
    print(f"Starting PDF text extraction for user {user_id}")
    
    try:
        # Initialize Document AI client
        print('Will initialize the Document AI client')
        client = documentai.DocumentProcessorServiceClient()
        print('Document AI client initialized')
        
        # Get the processor name (you'll need to create a processor in Google Cloud Console)
        # Format: projects/{project_id}/locations/{location}/processors/{processor_id}
        project_id = "chat-with-it-e09f2"  # Replace with your actual project ID
        location = "us"  # or your preferred location
        processor_id = "514688bd85f76c47"  # You'll need to create this in Google Cloud Console
        
        processor_name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"
        

        # Download the PDF from Firebase Storage
        print('Will create the storage client')
        storage_client = storage.Client()
        print('Storage client initialized')
        bucket = storage_client.bucket(bucket_name)
        print('Bucket retrieved')
        blob = bucket.blob(file_path)
        print('Blob retrieved')

        # Download to temporary file
        print('Will download the PDF to a temporary file')
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            blob.download_to_filename(temp_file.name)
            temp_file_path = temp_file.name
        print('PDF downloaded')

        # Read the file into memory
        print('Will read the file into memory')
        with open(temp_file_path, "rb") as file:
            file_content = file.read()
        print('File content read')
        # Clean up temporary file
        os.unlink(temp_file_path)
        print('Temporary file deleted')
        
        print('Will call Document AI API to get the raw document')
        # Configure the process request
        raw_document = documentai.RawDocument(
            content=file_content,
            mime_type="application/pdf"
        )
        print('Raw document created')

        print('Will call the Document AI API to create the request')
        # Create the request
        request = documentai.ProcessRequest(
            name=processor_name,
            raw_document=raw_document
        )
        print('Request created')
        
        # Process the document
        print('Will call the Document AI API to process the document')
        result = client.process_document(request=request)
        document = result.document

        # Extract text content
        text_content = document.text
        print('Document extracted')
        
        # Convert to markdown format
        markdown_content = convert_document_to_markdown(document)
        
        print(f"PDF extraction completed. Text length: {len(text_content)} characters")
        return markdown_content
        
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        raise e


def convert_document_to_markdown(document) -> str:
    """
    Convert Document AI document to markdown format.
    
    Args:
        document: Document AI document object
        
    Returns:
        str: Document content in markdown format
    """
    markdown_content = []
    
    # Add document title if available
    if document.title:
        markdown_content.append(f"# {document.title}\n")
    
    # Process pages
    for page_num, page in enumerate(document.pages, 1):
        markdown_content.append(f"## Page {page_num}\n")
        
        # Process text blocks
        for block in page.blocks:
            if block.layout.text_anchor:
                text = extract_text_from_anchor(document.text, block.layout.text_anchor)
                if text.strip():
                    # Determine if this is a heading based on font size or other properties
                    if block.layout.confidence > 0.9:  # High confidence might indicate headings
                        markdown_content.append(f"### {text}\n")
                    else:
                        markdown_content.append(f"{text}\n")
    
    return "\n".join(markdown_content)


def extract_text_from_anchor(text: str, text_anchor) -> str:
    """
    Extract text from Document AI text anchor.
    
    Args:
        text: Full document text
        text_anchor: Text anchor object from Document AI
        
    Returns:
        str: Extracted text segment
    """
    if not text_anchor.text_segments:
        return ""
    
    text_segments = []
    for segment in text_anchor.text_segments:
        start_index = segment.start_index
        end_index = segment.end_index
        text_segments.append(text[start_index:end_index])
    
    return "".join(text_segments)
