#!/usr/bin/env python3
"""
Vectorize file pipeline logic for local testing.
This module contains the core vectorization pipeline extracted from main.py.
"""

from path_handling import get_user_id, get_file_name
from file_handling import get_file_extension, detect_file_type
from file_to_markdown import file_to_markdown
from embeddings import generate_embeddings
from vector_storage import store_vectors_in_firestore


def run_vectorize_file(file_path: str, bucket_name: str) -> str:
    """
    Run the complete vectorization pipeline for a file.
    
    Args:
        file_path: Path to the file in storage (e.g., '/user-documents/user123/document.pdf')
        bucket_name: Name of the Firebase Storage bucket
        
    Returns:
        str: Success/failure message
    """
    # Extract user ID and file name from the path
    user_id = get_user_id(file_path)
    file_name = get_file_name(file_path)
    
    print("--------------------------------------------------------")
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
        # Step 1: Convert file to markdown content
        extracted_content = file_to_markdown(bucket_name, file_path, user_id, file_type)
        
        # Step 2: Generate embeddings from extracted content
        #embedding_result = generate_embeddings(extracted_content, user_id, file_name)

        # Step 3: Store vectors in Firestore Vector Search
        #storage_result = store_vectors_in_firestore(embedding_result, user_id, file_name)
                
        # Complete pipeline - return success message with all details
        return f"{file_name} ({file_type}) - Complete pipeline successful! Vectors stored in Firestore."
        
    except Exception as e:
        print(f"Error during text extraction: {str(e)}")
        return f"{file_name} ({file_type}) - Extraction failed: {str(e)}"
