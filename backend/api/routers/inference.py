from flask import Blueprint, jsonify, request
import time

bp = Blueprint('inference', __name__)

@bp.route("/completions", methods=["POST"])
def chat_completions():
    """OpenAI-compatible Chat Completion Endpoint."""
    data = request.get_json()
    model = data.get("model")
    messages = data.get("messages", [])
    use_rag = data.get("use_rag", False)
    
    context_text = ""
    sources = []
    
    if use_rag and messages:
        # Get last user message
        last_msg = next((m for m in reversed(messages) if m["role"] == "user"), None)
        if last_msg:
            from backend.engine.rag_engine import rag_engine
            try:
                results = rag_engine.search(last_msg["content"], k=3)
                
                if results:
                    context_text = "\n\n".join([f"Context [{r['document']['metadata']['source']}]: {r['document']['content']}" for r in results])
                    sources = [r['document']['metadata'] for r in results]
                    
                    # Inject context
                    system_instruction = f"Answer utilizing the following context:\n{context_text}"
                    # Prepend or append to messages
                    messages.insert(0, {"role": "system", "content": system_instruction})
            except Exception as e:
                print(f"RAG Error: {e}")
                # Fallback to normal chat without RAG

    # Logic to invoke Inference Engine...
    # For now, we are enriching the mock response to show we "used" the context.
    
    response_content = "This is a response from NeuroForge Inference Engine (Flask)."
    if context_text:
        response_content += "\n\n(I used your Knowledge Base to answer this! Check the sources.)"

    response = {
        "id": "chatcmpl-123",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": response_content
            },
            "finish_reason": "stop"
        }],
        "usage": {"prompt_tokens": 10, "completion_tokens": 10, "total_tokens": 20},
        "rag_sources": sources
    }
    return jsonify(response)
