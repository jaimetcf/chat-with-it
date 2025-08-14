from firebase_admin import firestore as admin_firestore
from typing import Dict, Any, List
import uuid
from datetime import datetime


def store_vectors_in_firestore(
    embedding_result: Dict[str, Any], 
    user_id: str, 
    file_name: str
) -> Dict[str, Any]:
    """
    Store embeddings in Firestore with vector search capabilities.
    
    Args:
        embedding_result: Result from generate_embeddings function
        user_id: User ID for the embeddings
        file_name: Name of the file being processed
        
    Returns:
        Dict containing storage results and metadata
    """
    print(f"Starting vector storage in Firestore for user {user_id}, file: {file_name}")
    
    try:
        # Initialize Firestore client
        db = admin_firestore.client()
        
        # Collection for storing vector embeddings
        vectors_collection = db.collection('vector_embeddings')
        
        # Collection for storing file metadata
        files_collection = db.collection('processed_files')
        
        stored_vectors = []
        file_document_id = str(uuid.uuid4())
        
        # Store each embedding as a separate document
        for i, embedding_data in enumerate(embedding_result['embeddings']):
            # Create document ID for this vector
            vector_document_id = f"{file_document_id}_chunk_{i}"
            
            # Prepare vector document data
            vector_doc = {
                'id': vector_document_id,
                'user_id': user_id,
                'file_name': file_name,
                'file_document_id': file_document_id,
                'chunk_index': embedding_data['chunk_index'],
                'chunk_text': embedding_data['chunk_text'],
                'chunk_length': embedding_data['chunk_length'],
                'total_chunks': embedding_data['total_chunks'],
                'embedding_model': embedding_result['metadata']['embedding_model'],
                'embedding_dimensions': embedding_result['metadata']['embedding_dimensions'],
                'embedding_vector': embedding_data['embedding'],  # This will be indexed for vector search
                'created_at': admin_firestore.SERVER_TIMESTAMP,
                'updated_at': admin_firestore.SERVER_TIMESTAMP
            }
            
            # Store the vector document
            vector_ref = vectors_collection.document(vector_document_id)
            vector_ref.set(vector_doc)
            
            stored_vectors.append({
                'vector_id': vector_document_id,
                'chunk_index': embedding_data['chunk_index'],
                'chunk_preview': embedding_data['chunk_text'][:100] + "..." if len(embedding_data['chunk_text']) > 100 else embedding_data['chunk_text']
            })
            
            print(f"Stored vector {i+1}/{len(embedding_result['embeddings'])}: {vector_document_id}")
        
        # Store file metadata document
        file_metadata = {
            'id': file_document_id,
            'user_id': user_id,
            'file_name': file_name,
            'file_type': get_file_type_from_name(file_name),
            'total_chunks': embedding_result['metadata']['total_chunks'],
            'total_tokens': embedding_result['metadata']['total_tokens'],
            'embedding_model': embedding_result['metadata']['embedding_model'],
            'embedding_dimensions': embedding_result['metadata']['embedding_dimensions'],
            'vector_count': len(embedding_result['embeddings']),
            'processing_status': 'completed',
            'created_at': admin_firestore.SERVER_TIMESTAMP,
            'updated_at': admin_firestore.SERVER_TIMESTAMP
        }
        
        file_ref = files_collection.document(file_document_id)
        file_ref.set(file_metadata)
        
        # Prepare result
        result = {
            'success': True,
            'file_document_id': file_document_id,
            'stored_vectors': stored_vectors,
            'metadata': {
                'user_id': user_id,
                'file_name': file_name,
                'total_vectors_stored': len(stored_vectors),
                'embedding_model': embedding_result['metadata']['embedding_model'],
                'embedding_dimensions': embedding_result['metadata']['embedding_dimensions'],
                'storage_timestamp': datetime.now().isoformat()
            }
        }
        
        print(f"Vector storage completed successfully. Stored {len(stored_vectors)} vectors")
        print(f"File metadata stored with ID: {file_document_id}")
        
        return result
        
    except Exception as e:
        print(f"Error storing vectors in Firestore: {str(e)}")
        raise e


def search_similar_vectors(query_embedding: List[float], user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search for similar vectors using Firestore vector search.
    
    Args:
        query_embedding: Query embedding vector
        user_id: User ID to search within
        limit: Maximum number of results to return
        
    Returns:
        List of similar vector documents
    """
    print(f"Searching for similar vectors for user {user_id}")
    
    try:
        # Initialize Firestore client
        db = admin_firestore.client()
        
        # Collection for vector embeddings
        vectors_collection = db.collection('vector_embeddings')
        
        # Query for vectors belonging to the user
        # Note: This is a basic implementation. For production, you'll want to use
        # Firestore's vector search capabilities when they become available
        query = vectors_collection.where('user_id', '==', user_id).limit(limit)
        
        # Get documents
        docs = query.stream()
        
        # For now, we'll do a simple cosine similarity calculation
        # In production, you'd use Firestore's built-in vector search
        results = []
        for doc in docs:
            doc_data = doc.to_dict()
            if 'embedding_vector' in doc_data:
                similarity = calculate_cosine_similarity(query_embedding, doc_data['embedding_vector'])
                results.append({
                    'document_id': doc.id,
                    'similarity_score': similarity,
                    'chunk_text': doc_data.get('chunk_text', ''),
                    'file_name': doc_data.get('file_name', ''),
                    'chunk_index': doc_data.get('chunk_index', 0)
                })
        
        # Sort by similarity score (descending)
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        print(f"Found {len(results)} similar vectors")
        return results
        
    except Exception as e:
        print(f"Error searching similar vectors: {str(e)}")
        raise e


def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors.
    
    Args:
        vec1: First vector
        vec2: Second vector
        
    Returns:
        float: Cosine similarity score between 0 and 1
    """
    if len(vec1) != len(vec2):
        raise ValueError("Vectors must have the same length")
    
    # Calculate dot product
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    
    # Calculate magnitudes
    magnitude1 = sum(a * a for a in vec1) ** 0.5
    magnitude2 = sum(b * b for b in vec2) ** 0.5
    
    # Avoid division by zero
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    # Calculate cosine similarity
    similarity = dot_product / (magnitude1 * magnitude2)
    
    return similarity


def get_file_type_from_name(file_name: str) -> str:
    """
    Extract file type from file name.
    
    Args:
        file_name: Name of the file
        
    Returns:
        str: File type (PDF, IMAGE, etc.)
    """
    if file_name.lower().endswith('.pdf'):
        return 'PDF'
    elif any(file_name.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp']):
        return 'IMAGE'
    else:
        return 'UNKNOWN'


def delete_file_vectors(file_document_id: str) -> bool:
    """
    Delete all vectors associated with a file.
    
    Args:
        file_document_id: ID of the file document
        
    Returns:
        bool: True if successful, False otherwise
    """
    print(f"Deleting vectors for file: {file_document_id}")
    
    try:
        # Initialize Firestore client
        db = admin_firestore.client()
        
        # Collection for vector embeddings
        vectors_collection = db.collection('vector_embeddings')
        
        # Query for vectors belonging to this file
        query = vectors_collection.where('file_document_id', '==', file_document_id)
        
        # Delete all matching documents
        deleted_count = 0
        for doc in query.stream():
            doc.reference.delete()
            deleted_count += 1
        
        # Delete the file metadata document
        files_collection = db.collection('processed_files')
        file_ref = files_collection.document(file_document_id)
        file_ref.delete()
        
        print(f"Successfully deleted {deleted_count} vectors and file metadata")
        return True
        
    except Exception as e:
        print(f"Error deleting file vectors: {str(e)}")
        return False
