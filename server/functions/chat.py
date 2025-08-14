import asyncio
from typing import Optional
from firebase_admin import firestore as admin_firestore
from firestore_session import FirestoreSession


def run_chat(uid: str, prompt: str, session_id: str, client_message_id: Optional[str] = None) -> dict:
    """Core chat processing logic."""
    try:
        print(f"Processing chat for session {session_id} with prompt {prompt}")

        # Lazy import to avoid deployment timeout
        from agents import Agent, Runner, ModelSettings, FileSearchTool

        db = admin_firestore.client()

        # Reads the list of vector_store_ids for the user
        user_vector_stores_ref = db.collection('user_vector_stores').document(uid)
        user_vector_stores_doc = user_vector_stores_ref.get()
        vector_store_ids = user_vector_stores_doc.get('vector_store_ids')

        # Create the AI agent
        agent = Agent(
            name="Chat Assistant",
            instructions=(
                "You are a helpful assistant specialized in answering questions about the user's documents. "
                "You have access to the tool: FileSearchTool. "
                "Use this tool to search for information in the user's vector stores. "
                "Prioritize using the FileSearchTool to answer the user's question. "
                "Provide clear, accurate, and concise responses. "
                "Provide the source of your information in the format: [Source: <file_name>, page number]."
            ),
            model="gpt-4.1",
            model_settings=ModelSettings(temperature=0.1),
            tools=[
                FileSearchTool(
                    max_num_results=3,
                    vector_store_ids=vector_store_ids,
                ),
            ],
        )

        # Create session if missing. Otherwise update only updatedAt
        session_ref = db.collection('sessions').document(session_id)
        sessionSnap = session_ref.get()                
        if sessionSnap.exists:
            session_ref.update({'updatedAt': admin_firestore.SERVER_TIMESTAMP})
        else:
            session_ref.set(
                {
                    'userId': uid,
                    'createdAt': admin_firestore.SERVER_TIMESTAMP,
                    'updatedAt': admin_firestore.SERVER_TIMESTAMP,
                    'sessionId': session_id,
                }
            )

        # Prepare a persistent session class to be managed by the AI Agent
        session = FirestoreSession(uid, session_id)

        # Run the agent asynchronously with Firestore session
        print(f"Starting agent ...")
        result = asyncio.run(Runner.run(agent, prompt, session=session))
        assistant_response: str = result.final_output or ""

        return {
            'success': True,
            'message': 'Agent run completed successfully',
            "data": assistant_response,
            "meta": { "sessionId": session_id }
        }
        
    except Exception as e:
        print(f"Error processing chat: {str(e)}")
        return {
            'success': False,
            'message': f'Error processing chat: {str(e)}',
            'data': None
        }
