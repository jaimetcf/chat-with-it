import asyncio
from typing import Optional
from firebase_admin import firestore as admin_firestore
from firestore_session import FirestoreSession


def run_chat(uid: str, prompt: str, session_id: str, client_message_id: Optional[str] = None) -> dict:
    """Core chat processing logic."""
    try:
        print(f"Processing chat for session {session_id} with prompt {prompt}")

        # Lazy import to avoid deployment timeout
        from agents import Agent, Runner, ModelSettings

        # Create the AI agent
        agent = Agent(
            name="Chat Assistant",
            instructions=(
                "You are a helpful assistant. Provide clear, accurate, and concise responses."
            ),
            model="gpt-4.1",
            model_settings=ModelSettings(temperature=0.1)
        )

        db = admin_firestore.client()
        session_ref = db.collection('sessions').document(session_id)
        sessionSnap = session_ref.get()        
        
        # Create session if missing. Otherwise update only updatedAt
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
