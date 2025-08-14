import os
import openai
from typing import List, Dict, Any


def generate_embeddings(text_content: str, user_id: str, file_name: str) -> Dict[str, Any]:
    """
    Generate embeddings for text content using OpenAI text-embedding-ada-002.
    
    Args:
        text_content: The text content to generate embeddings for
        user_id: User ID for logging purposes
        file_name: Name of the file being processed
        
    Returns:
        Dict containing embedding data and metadata
    """
    print(f"Starting embedding generation for user {user_id}, file: {file_name}")
    
    try:
        # Initialize OpenAI client
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        
        # Split text into chunks if it's too long
        # OpenAI has a limit of 8192 tokens per request
        text_chunks = split_text_into_chunks(text_content, max_tokens=8000)
        
        print(f"Split text into {len(text_chunks)} chunks for embedding generation")
        
        all_embeddings = []
        chunk_metadata = []
        
        # Generate embeddings for each chunk
        for i, chunk in enumerate(text_chunks):
            print(f"Generating embedding for chunk {i+1}/{len(text_chunks)}")
            
            # Generate embedding using OpenAI
            response = openai.Embedding.create(
                model="text-embedding-ada-002",
                input=chunk
            )
            
            # Extract embedding vector
            embedding = response['data'][0]['embedding']
            
            # Store embedding with metadata
            embedding_data = {
                'embedding': embedding,
                'chunk_index': i,
                'chunk_text': chunk,
                'chunk_length': len(chunk),
                'total_chunks': len(text_chunks)
            }
            
            all_embeddings.append(embedding_data)
            
            # Store chunk metadata for vector database
            chunk_metadata.append({
                'chunk_index': i,
                'text_preview': chunk[:200] + "..." if len(chunk) > 200 else chunk,
                'chunk_length': len(chunk),
                'user_id': user_id,
                'file_name': file_name
            })
        
        # Prepare result
        result = {
            'embeddings': all_embeddings,
            'metadata': {
                'user_id': user_id,
                'file_name': file_name,
                'total_chunks': len(text_chunks),
                'total_tokens': sum(len(chunk.split()) for chunk in text_chunks),
                'embedding_model': 'text-embedding-ada-002',
                'embedding_dimensions': len(all_embeddings[0]['embedding']) if all_embeddings else 0
            },
            'chunk_metadata': chunk_metadata
        }
        
        print(f"Embedding generation completed. Generated {len(all_embeddings)} embeddings")
        print(f"Embedding dimensions: {result['metadata']['embedding_dimensions']}")
        
        return result
        
    except Exception as e:
        print(f"Error generating embeddings: {str(e)}")
        raise e


def split_text_into_chunks(text: str, max_tokens: int = 8000) -> List[str]:
    """
    Split text into chunks that fit within token limits.
    
    Args:
        text: The text to split
        max_tokens: Maximum tokens per chunk
        
    Returns:
        List of text chunks
    """
    # Simple splitting by sentences and paragraphs
    # In a production environment, you might want to use a more sophisticated tokenizer
    
    # Split by paragraphs first
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = ""
    
    for paragraph in paragraphs:
        # If adding this paragraph would exceed the limit, start a new chunk
        if len(current_chunk + paragraph) > max_tokens * 4:  # Rough estimate: 1 token ≈ 4 characters
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = paragraph
            else:
                # If a single paragraph is too long, split by sentences
                sentences = paragraph.split('. ')
                for sentence in sentences:
                    if len(current_chunk + sentence) > max_tokens * 4:
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                            current_chunk = sentence
                        else:
                            # If a single sentence is too long, truncate it
                            chunks.append(sentence[:max_tokens * 4])
                    else:
                        current_chunk += sentence + ". "
        else:
            current_chunk += paragraph + "\n\n"
    
    # Add the last chunk if it has content
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return chunks


def get_embedding_dimensions() -> int:
    """
    Get the dimensions of embeddings generated by text-embedding-ada-002.
    
    Returns:
        int: Number of dimensions (1536 for text-embedding-ada-002)
    """
    return 1536
