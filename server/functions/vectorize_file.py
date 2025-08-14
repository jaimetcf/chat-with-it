#!/usr/bin/env python3
"""
Vectorize file pipeline logic for local testing.
This module contains the core vectorization pipeline extracted from main.py.
"""
from google.cloud.firestore import DocumentReference, DocumentSnapshot
from firebase_admin import storage
from firebase_admin import firestore
from openai import OpenAI
import io

from path_handling import get_user_id, get_file_name
from file_handling import get_file_extension, detect_file_type


AWAIT_MAX_SECONDS = 30  # Maximum wait time in seconds


def run_vectorize_file(file_path: str, bucket_name: str) -> str:
    """
    Run the complete vectorization pipeline for a file.
    
    Args:
        file_path: Path to the file in storage (e.g., '/user-documents/user123/document.pdf')
        bucket_name: Name of the Firebase Storage bucket
        
    Returns:
        str: Success/failure message
    """
    import os
    
    # Extract user ID and file name from the path
    user_id = get_user_id(file_path)
    file_name = get_file_name(file_path)
    
    print("vectorize_file function started with success triggered by: ")
    print(f"File uploaded: {file_name}")
    print(f"User ID: {user_id}")
    print(f"Full path: {file_path}")
    print(f"Bucket: {bucket_name}")
    
    # File type detection
    file_extension = get_file_extension(file_name)
    file_type = detect_file_type(file_extension)
    
    print(f"File extension: {file_extension}")
    print(f"Detected file type: {file_type}")
    
    try:
        # Check if file type is supported by OpenAI FileSearch
        supported_extensions = {
            '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.txt', '.rtf', 
            '.odt', '.ods', '.odp', '.csv', '.tsv', '.json', '.xml', '.html', '.htm',
            '.md', '.markdown', '.tex', '.latex', '.epub', '.mobi', '.azw3'
        }
        
        if file_extension.lower() not in supported_extensions:
            return f"{file_name} ({file_type}) - File type not supported by OpenAI FileSearch. Supported types: {', '.join(supported_extensions)}"
        
        openai_client = OpenAI(api_key= os.getenv('OPENAI_API_KEY'))
        db_client = firestore.client()
        user_vector_stores_ref = db_client.collection('user_vector_stores').document(user_id)
        user_vector_stores_doc = user_vector_stores_ref.get()
            
        in_memory_file = download_file_to_memory(file_path, bucket_name, file_extension)
        file_id = upload_file_to_openai(in_memory_file, openai_client, file_name)
        vector_store_id = get_vector_store(user_id, user_vector_stores_doc, openai_client)
        add_file_to_vector_store(openai_client, vector_store_id, file_id)
        await_vector_store_processing(openai_client, vector_store_id, file_id)
        update_firestore_vector_store(
            user_vector_stores_ref, user_vector_stores_doc, user_id, vector_store_id)
            
        return f"{file_name} ({file_type}) - OpenAI Vector Store pipeline successful! File vectorized and stored in OpenAI Vector Store."
            
    except Exception as e:
        print(f"Error during OpenAI Vector Store processing: {str(e)}")
        return f"{file_name} ({file_type}) - OpenAI Vector Store processing failed: {str(e)}"

    finally:
        # Clean up temporary file with retry mechanism
        if 'in_memory_file' in locals():
            import os
            import time
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    in_memory_file.close()
                    break
                except Exception as e:
                    print(f"Attempt {attempt + 1} to close in-memory file failed: {str(e)}")
                    if attempt == max_retries - 1:
                        print(f"Failed to close in-memory file after {max_retries} attempts")
                    time.sleep(1)  # Wait before retrying



def download_file_to_memory(
    file_path: str, 
    bucket_name: str, 
    file_extension: str
) -> 'io.BytesIO':
    """
    Download a file from Firebase Storage to an in-memory bytes object.
    
    Args:
        file_path: Path to the file in storage (e.g., '/user-documents/user123/document.pdf')
        bucket_name: Name of the Firebase Storage bucket
        file_extension: File extension to use for the temporary file
        
    Returns:
        io.BytesIO: In-memory bytes object containing the file content
        
    Raises:
        Exception: If file download fails
    """    
    bucket = storage.bucket(bucket_name)
    blob = bucket.blob(file_path)
    
    print(f"Downloading file from Firebase Storage: {file_path}")
    # Download file content as bytes
    file_bytes = blob.download_as_bytes()
    # Create an in-memory bytes object
    in_memory_file = io.BytesIO(file_bytes)
    
    print(f"File downloaded to in-memory object")
    return in_memory_file


def upload_file_to_openai(temp_file: 'io.BytesIO', openai_client: OpenAI, file_name: str) -> str:
    """
    Upload an in-memory file to OpenAI.
    
    Args:
        temp_file: In-memory file object to upload
        openai_client: OpenAI client instance
        file_name: Name of the file for identification in OpenAI
        
    Returns:
        str: OpenAI file ID
        
    Raises:
        Exception: If file upload fails
    """
    try:
        file_upload = openai_client.files.create(
            file=(file_name, temp_file),
            purpose='assistants'
        )
    
        print(f"File uploaded to OpenAI with ID: {file_upload.id}")
        return file_upload.id
    finally:
        # Ensure the file is closed before any further operations
        temp_file.close() if temp_file else None


def get_vector_store(
    user_id: str, 
    user_vector_stores_doc: DocumentSnapshot, 
    openai_client: OpenAI
) -> str:
    """
    Get an existing vector store for a user or create a new one.
    
    Args:
        user_id: ID of the user
        user_vector_stores_doc: Firestore document for user's vector stores
        openai_client: OpenAI client instance
        
    Returns:
        str: ID of the vector store
    """
    if user_vector_stores_doc.exists:
        # User already has vector stores, get the first one or create new
        user_data = user_vector_stores_doc.to_dict()
        vector_store_ids = user_data.get('vector_store_ids', [])
        
        if vector_store_ids:
            # Use existing vector store
            vector_store_id = vector_store_ids[0]
            print(f"Using existing vector store: {vector_store_id}")
        else:
            # Create new vector store
            vector_store = openai_client.vector_stores.create(
                name=f"Vector Store for {user_id}",
                expires_after={"anchor": "last_active_at", "days": 30}
            )
            vector_store_id = vector_store.id
            print(f"Created new vector store: {vector_store_id}")
    else:
        # Create new vector store for new user
        vector_store = openai_client.vector_stores.create(
            name=f"Vector Store for {user_id}",
            expires_after={"anchor": "last_active_at", "days": 30}
        )
        vector_store_id = vector_store.id
        print(f"Created new vector store for new user: {vector_store_id}")
    
    return vector_store_id

def add_file_to_vector_store(
    openai_client: OpenAI, 
    vector_store_id: str, 
    file_id: str
) -> str:
    """
    Add a file to a vector store.
    
    Args:
        openai_client: OpenAI client instance
        vector_store_id: ID of the vector store
        file_id: ID of the file to add
        
    Returns:
        str: ID of the vector store file (same as file_id for consistency)
    """
    vector_store_file = openai_client.vector_stores.files.create(
        vector_store_id=vector_store_id,
        file_id=file_id
    )
    
    print(f"File added to vector store with ID: {vector_store_file.id}")
    return vector_store_file.id


def await_vector_store_processing(
    openai_client: OpenAI, 
    vector_store_id: str, 
    file_id: str
) -> None:
    """
    Wait for vector store file processing to complete.
    
    Args:
        openai_client: OpenAI client instance
        vector_store_id: ID of the vector store
        file_id: ID of the file in the vector store
        
    Raises:
        Exception: If processing fails, is cancelled, or times out
    """
    import time
    
    elapsed_seconds = 0    
    while elapsed_seconds < AWAIT_MAX_SECONDS:
        file_status = openai_client.vector_stores.files.retrieve(
            vector_store_id=vector_store_id,
            file_id=file_id
        )
        
        if file_status.status == 'completed':
            print("File processing completed successfully")
            break
        elif file_status.status == 'failed':
            raise Exception(f"File processing failed: {file_status.last_error}")
        elif file_status.status == 'cancelled':
            raise Exception("File processing was cancelled")
        
        print(f"File status: {file_status.status}")
        time.sleep(1)
        elapsed_seconds += 1
    else:
        raise Exception(f"Timeout: File processing did not complete within {AWAIT_MAX_SECONDS} seconds")

def update_firestore_vector_store(
    user_vector_stores_ref: DocumentReference, 
    user_vector_stores_doc: DocumentSnapshot, 
    user_id: str, 
    vector_store_id: str
) -> None:
    """
    Update Firestore with the vector store ID for a user.
    
    Args:
        user_vector_stores_ref: Firestore reference to the user's vector stores document
        user_vector_stores_doc: Firestore document snapshot for the user's vector stores
        user_id: ID of the user
        vector_store_id: ID of the vector store to store
        
    Returns:
        None
    """
    if not user_vector_stores_doc.exists:
        # Create new user vector stores document
        user_vector_stores_ref.set({
            'user_id': user_id,
            'vector_store_ids': [vector_store_id]
        })
    else:
        # Update existing user vector stores document
        user_data = user_vector_stores_doc.to_dict()
        vector_store_ids = user_data.get('vector_store_ids', [])
        
        if vector_store_id not in vector_store_ids:
            vector_store_ids.append(vector_store_id)
            user_vector_stores_ref.update({
                'vector_store_ids': vector_store_ids
            })

    print(f"Updated Firestore with vector store ID: {vector_store_id}")
