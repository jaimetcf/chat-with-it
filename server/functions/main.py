from typing import List, Optional, Dict, Any
from firebase_functions import https_fn, storage_fn
from firebase_functions.options import set_global_options
from firebase_admin import initialize_app

from chat import run_chat
from vectorize_file import run_vectorize_file


# Maximum number of containers that can be running at the same time.
set_global_options(max_instances=2)

app = initialize_app()


@https_fn.on_call()
def chat(req: https_fn.CallableRequest) -> any:
    """Process user prompt using OpenAI Agents SDK and return response"""

    # Require authenticated user
    if not req.auth or not req.auth.uid:
        return {
            'success': False,
            'message': 'Unauthenticated request',
            'data': None
        }

    uid = req.auth.uid
    prompt = req.data.get('prompt')
    session_id = req.data.get('sessionId') or 'default'
    client_message_id = req.data.get('clientMessageId')  # optional for dedupe
    if prompt is None:
        return {
            'success': False,
            'message': 'No text prompt provided',
            'data': None
        }

    return run_chat(uid, prompt, session_id, client_message_id)


@storage_fn.on_object_finalized(bucket="chat-with-it-e09f2.firebasestorage.app")
def vectorize_file(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]) -> str:
    """
    Cloud function triggered by file upload to /user-documents folder.
    
    Args:
        event: CloudEvent containing storage object data
        
    Returns:
        str: The name of the uploaded file
    """
    # Extract file information from the event
    file_path = event.data.name
    bucket_name = event.data.bucket
    
    # Run the vectorization pipeline
    return run_vectorize_file(file_path, bucket_name)
