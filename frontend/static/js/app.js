/**
 * NeuroForge Application Controller
 * Handles frontend interactions and API calls.
 */

const API_BASE = "/api/v1";

document.addEventListener('DOMContentLoaded', () => {
    // Determine current page
    const path = window.location.pathname;

    if (path.includes('/chat')) {
        initChat();
    } else if (path.includes('/models')) {
        initModels();
    } else if (path.includes('/training')) {
        initTraining();
    }
});

/**
 * --- CHAT MODULE ---
 */
function initChat() {
    const sendBtn = document.querySelector('.chat-input-area .btn');
    const inputField = document.querySelector('.chat-input');
    const messagesContainer = document.getElementById('chat-messages');

    async function sendMessage() {
        const text = inputField.value.trim();
        if (!text) return;

        // 1. Add User Message
        appendMessage('user', text);
        inputField.value = '';

        // 2. Show Loading State (Mock)
        const loadingId = appendMessage('assistant', 'Thinking...', true);

        try {
            // 3. API Call
            const response = await fetch(`${API_BASE}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3-8b',
                    messages: [{ role: 'user', content: text }]
                })
            });
            const data = await response.json();

            // 4. Update Assistant Message
            updateMessage(loadingId, data.choices[0].message.content);

        } catch (error) {
            updateMessage(loadingId, "Error: Could not reach NeuroForge Engine.");
            console.error(error);
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function appendMessage(role, text, isLoading = false) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        const id = 'msg-' + Date.now();
        div.id = id;
        
        const avatarIcon = role === 'user' ? 'fa-user' : (role === 'system' ? 'fa-robot' : 'fa-brain');
        
        div.innerHTML = `
            <div class="avatar"><i class="fas ${avatarIcon}"></i></div>
            <div class="bubble">${text}</div>
        `;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return id;
    }

    function updateMessage(id, newText) {
        const el = document.getElementById(id);
        if (el) {
            el.querySelector('.bubble').textContent = newText;
        }
    }
}

/**
 * --- MODELS MODULE ---
 */
function initModels() {
    const refreshBtn = document.querySelector('.header-actions .btn.secondary');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.innerHTML = '<i class="fas fa-spin fa-spinner"></i> Refreshing...';
            try {
                const res = await fetch(`${API_BASE}/models/`);
                const models = await res.json();
                console.log("Refreshed Models:", models);
                // logic to rebuild grid would go here
                setTimeout(() => refreshBtn.innerHTML = '<i class="fas fa-sync"></i> Refresh', 500);
            } catch (e) {
                console.error(e);
                refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
            }
        });
    }
}

/**
 * --- TRAINING MODULE ---
 */
function initTraining() {
    const startBtn = document.querySelector('.training-config .btn.primary');
    if(startBtn) {
        startBtn.addEventListener('click', async () => {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Initializing...';
            
            // Mock starting a job
            setTimeout(() => {
                startBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Training';
                startBtn.classList.replace('primary', 'danger');
                startBtn.disabled = false;
                
                // Add log
                const consoleOutput = document.querySelector('.console-output');
                const line = document.createElement('span');
                line.className = 'log-line';
                line.innerHTML = `<span class="accent">[${new Date().toLocaleTimeString()}]</span> Training Job Started via API.`;
                consoleOutput.appendChild(line);
            }, 1500);
        });
    }
}
