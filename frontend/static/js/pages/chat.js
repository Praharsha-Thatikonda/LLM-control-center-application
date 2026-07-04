document.addEventListener('DOMContentLoaded', () => {
    const messagesContainer = document.getElementById('chat-messages');
    const inputField = document.querySelector('.chat-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-chat-btn');
    const modelSelect = document.querySelector('.form-select');

    // New Elements
    const incognitoToggle = document.getElementById('incognito-toggle');
    const ragToggle = document.getElementById('rag-toggle');
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    const filePreviewArea = document.getElementById('file-preview-area');
    const exportBtn = document.getElementById('export-chat-btn');

    // Sliders
    const tempSlider = document.getElementById('temp-slider');
    const toppSlider = document.getElementById('topp-slider');
    const repSlider = document.getElementById('rep-slider');
    const maxTokensInput = document.getElementById('max-tokens');

    // Labels for Sliders
    const tempVal = document.getElementById('temp-val');
    const toppVal = document.getElementById('topp-val');
    const repVal = document.getElementById('rep-val');

    // Presets
    const presetBtns = document.querySelectorAll('.preset-buttons .btn');

    let currentAttachments = [];

    // --- Event Listeners for Sliders ---
    if (tempSlider) tempSlider.addEventListener('input', (e) => tempVal.innerText = e.target.value);
    if (toppSlider) toppSlider.addEventListener('input', (e) => toppVal.innerText = e.target.value);
    if (repSlider) repSlider.addEventListener('input', (e) => repVal.innerText = e.target.value);

    // --- Preset Logic ---
    const PRESETS = {
        'balanced': { temp: 0.7, topp: 0.9, rep: 1.1, sys: "You are a helpful AI assistant." },
        'precise': { temp: 0.1, topp: 0.1, rep: 1.0, sys: "You are a precise and factual assistant. Provide concise answers." },
        'creative': { temp: 1.1, topp: 1.0, rep: 1.15, sys: "You are a creative and imaginative assistant. Be descriptive." }
    };

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Toggle
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const key = btn.dataset.preset;
            const p = PRESETS[key];
            if (p) {
                // Apply values
                if (tempSlider) { tempSlider.value = p.temp; tempVal.innerText = p.temp; }
                if (toppSlider) { toppSlider.value = p.topp; toppVal.innerText = p.topp; }
                if (repSlider) { repSlider.value = p.rep; repVal.innerText = p.rep; }

                const sysPrompt = document.getElementById('system-prompt');
                if (sysPrompt) sysPrompt.value = p.sys;
            }
        });
    });

    // --- Export Chat Logic ---
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const msgs = document.querySelectorAll('.message .bubble');
            let content = "NeuroForge Chat History\n======================\n\n";
            msgs.forEach(bubble => {
                const roleDiv = bubble.parentElement.classList.contains('user') ? "User" :
                    (bubble.parentElement.classList.contains('system') ? "System" : "Assistant");
                content += `[${roleDiv}]: ${bubble.innerText}\n\n`;
            });

            const blob = new Blob([content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
        });
    }

    // Initialize Mermaid
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
    }

    // Incognito Toggle
    if (incognitoToggle) {
        incognitoToggle.addEventListener('change', function () {
            if (this.checked) {
                document.body.classList.add('incognito-active');
            } else {
                document.body.classList.remove('incognito-active');
            }
        });
    }

    // File Attachments
    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', function () {
            if (this.files) {
                Array.from(this.files).forEach(file => {
                    currentAttachments.push(file);
                    renderPreview(file);
                });
            }
            this.value = ''; // Reset so same file can be selected again
        });
    }

    function renderPreview(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const div = document.createElement('div');
            div.className = 'file-preview-item';

            let content = '';
            if (file.type.startsWith('image/')) {
                content = `<img src="${e.target.result}" alt="preview">`;
            } else if (file.type.startsWith('video/')) {
                content = `<video src="${e.target.result}"></video>`;
            } else {
                content = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:24px;background:#f1f5f9;"><i class="fas fa-file"></i></div>`;
            }

            div.innerHTML = `
                ${content}
                <button class="remove-file" onclick="this.parentElement.remove()">&times;</button>
            `;

            // Allow removing
            div.querySelector('.remove-file').addEventListener('click', (ev) => {
                ev.stopPropagation();
                currentAttachments = currentAttachments.filter(f => f !== file);
                div.remove();
            });

            filePreviewArea.appendChild(div);
        }
        reader.readAsDataURL(file);
    }

    const promptSelect = document.getElementById('prompt-library-select');
    const systemPrompt = document.getElementById('system-prompt');

    // --- History Logic ---
    const historyListFn = document.getElementById('chat-history-list');
    const newChatBtn = document.getElementById('new-chat-sidemenu-btn');
    let currentSessionId = null;

    initializeHistory();

    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }

    function initializeHistory() {
        renderHistoryList();
        // Load most recent or start new
        const sessions = getSessions();
        if (sessions.length > 0) {
            loadSession(sessions[0].id);
        } else {
            startNewChat();
        }
    }

    function getSessions() {
        return JSON.parse(localStorage.getItem('neuroforge_chat_sessions') || '[]');
    }

    function saveSession(id, messages) {
        let sessions = getSessions();
        const existing = sessions.find(s => s.id === id);

        // Generate summary from first user message
        let summary = "New Conversation";
        const firstUserMsg = messages.find(m => m.role === 'user');
        if (firstUserMsg) {
            summary = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
        }

        if (existing) {
            existing.lastModified = Date.now();
            existing.summary = summary;
            existing.messageCount = messages.length;
        } else {
            sessions.unshift({
                id: id,
                created: Date.now(),
                lastModified: Date.now(),
                summary: summary,
                messageCount: messages.length
            });
        }
        localStorage.setItem('neuroforge_chat_sessions', JSON.stringify(sessions));

        // Save actual messages
        localStorage.setItem(`neuroforge_chat_${id}`, JSON.stringify(messages));

        renderHistoryList();
    }

    function loadSession(id) {
        currentSessionId = id;
        const messages = JSON.parse(localStorage.getItem(`neuroforge_chat_${id}`) || '[]');

        // Clear UI
        messagesContainer.innerHTML = '';

        // Render Messages
        messages.forEach(m => appendMessage(m.role, m.content, false)); // false = don't save again
        scrollToBottom();

        // Highlight active list item
        document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
        const activeItem = document.getElementById(`history-${id}`);
        if (activeItem) activeItem.classList.add('active');
    }

    function startNewChat() {
        currentSessionId = 'session_' + Date.now();
        messagesContainer.innerHTML = '';

        // Add System Initial Message
        const initMsg = { role: 'system', content: 'System ready. Loaded Llama-3-8B-Instruct.' };
        appendMessage(initMsg.role, initMsg.content, false);

        // Save initial empty state
        saveSession(currentSessionId, [initMsg]);
    }

    function renderHistoryList() {
        const sessions = getSessions();
        if (sessions.length === 0) {
            historyListFn.innerHTML = '<div class="history-placeholder">No recent chats</div>';
            return;
        }

        historyListFn.innerHTML = '';
        sessions.forEach(s => {
            const item = document.createElement('div');
            item.className = 'history-item';
            if (s.id === currentSessionId) item.classList.add('active');
            item.id = `history-${s.id}`;
            item.innerHTML = `
                ${s.summary}
                <span class="date-label">${new Date(s.lastModified).toLocaleDateString()} ${new Date(s.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            `;
            item.addEventListener('click', () => loadSession(s.id));
            historyListFn.appendChild(item);
        });
    }

    // Load Prompts
    loadPrompts();

    if (promptSelect) {
        promptSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            if (selectedOption.dataset.content) {
                systemPrompt.value = selectedOption.dataset.content;
            }
        });
    }

    async function loadPrompts() {
        if (!promptSelect) return;
        try {
            const res = await fetch('/api/v1/prompts/');
            const prompts = await res.json();

            prompts.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                opt.dataset.content = p.content;
                promptSelect.appendChild(opt);
            });
        } catch (e) { console.error('Failed to load prompts', e); }
    }

    // Auto-resize textarea
    inputField.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value === '') {
            this.style.height = 'auto';
        }
    });

    // Enter to send
    inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    if (clearBtn) {
        clearBtn.addEventListener('click', clearChat);
    }


    // ... (rest of simple init)

    async function sendMessage() {
        const text = inputField.value.trim();
        // Allow send if there are attachments even if no text
        if (!text && currentAttachments.length === 0) return;

        inputField.value = '';
        inputField.style.height = 'auto';
        filePreviewArea.innerHTML = '';

        // Process attachments to markdown/html for display
        let attachmentMarkup = '';
        if (currentAttachments.length > 0) {
            for (const file of currentAttachments) {
                attachmentMarkup += `\n*[Attached: ${file.name}]*`;
            }
            currentAttachments = [];
        }

        const fullMessage = text + attachmentMarkup;

        // Append User Message
        appendMessage('user', fullMessage);

        // Show Typing Indicator
        showTyping(true);

        try {
            const currentModel = modelSelect ? modelSelect.value : 'llama-3-8b';
            const useRag = ragToggle ? ragToggle.checked : false;

            // Get Params
            const temp = tempSlider ? parseFloat(tempSlider.value) : 0.7;
            const topp = toppSlider ? parseFloat(toppSlider.value) : 0.9;
            const rep = repSlider ? parseFloat(repSlider.value) : 1.1;
            const maxTok = maxTokensInput ? parseInt(maxTokensInput.value) : 2048;
            const sysPrompt = document.getElementById('system-prompt').value;

            // Construct messages with System Prompt if needed (or prepend it)
            // Ideally we prepend system prompt if it's the start, but for simplicity we send it every time 
            // relying on backend to handle or just prepend here.
            const msgsToSend = [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: fullMessage }
            ];

            const response = await fetch('/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: currentModel,
                    messages: msgsToSend,
                    use_rag: useRag,
                    temperature: temp,
                    top_p: topp,
                    repetition_penalty: rep,
                    max_tokens: maxTok
                })
            });

            const data = await response.json();

            // Hide Typing and Show Response
            showTyping(false);

            if (data.choices && data.choices.length > 0) {
                let responseText = data.choices[0].message.content;

                // Append sources if any
                if (data.rag_sources && data.rag_sources.length > 0) {
                    responseText += "\n\n**Sources:**\n";
                    data.rag_sources.forEach(s => {
                        responseText += `- *${s.source}* (Chunk ${s.chunk})\n`;
                    });
                }

                typewriterEffect(responseText);
            }

        } catch (error) {
            showTyping(false);
            appendMessage('system', 'Error processing request: ' + error.message);
        }
    }

    function appendMessage(role, text, save = true) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;

        const avatarIcon = role === 'user' ? 'fa-user' : (role === 'system' ? 'fa-hdd' : 'fa-brain');
        const content = formatText(text);

        msgDiv.innerHTML = `
            <div class="avatar"><i class="fas ${avatarIcon}"></i></div>
            <div class="bubble">${content}</div>
        `;

        messagesContainer.appendChild(msgDiv);
        processMessageContent(msgDiv);
        scrollToBottom();

        if (save && currentSessionId) {
            const msgs = JSON.parse(localStorage.getItem(`neuroforge_chat_${currentSessionId}`) || '[]');
            msgs.push({ role: role, content: text });
            saveSession(currentSessionId, msgs);
        }

        return msgDiv;
    }

    function typewriterEffect(text) {
        // Create the message container first
        const msgDiv = document.createElement('div');
        msgDiv.className = `message assistant`;
        msgDiv.innerHTML = `
            <div class="avatar"><i class="fas fa-brain"></i></div>
            <div class="bubble"></div>
        `;
        messagesContainer.appendChild(msgDiv);

        const bubble = msgDiv.querySelector('.bubble');
        let i = 0;
        const speed = 10; // ms per char

        function type() {
            if (i < text.length) {
                // Append text content (raw)
                bubble.textContent += text.charAt(i);
                i++;
                scrollToBottom();
                setTimeout(type, speed);
            } else {
                // Done typing, now render Markdown
                bubble.innerHTML = formatText(text);
                processMessageContent(msgDiv);
                scrollToBottom();

                // Save Assistant Message
                if (currentSessionId) {
                    const msgs = JSON.parse(localStorage.getItem(`neuroforge_chat_${currentSessionId}`) || '[]');
                    msgs.push({ role: 'assistant', content: text });
                    saveSession(currentSessionId, msgs);
                }
            }
        }
        type();
    }

    function processMessageContent(container) {
        // Highlight Code
        container.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        // Render Mermaid
        const mermaidDivs = container.querySelectorAll('.mermaid');
        if (mermaidDivs.length > 0 && typeof mermaid !== 'undefined') {
            mermaid.init(undefined, mermaidDivs);
        }
    }

    function clearChat() {
        if (confirm('Clear chat history?')) {
            messagesContainer.innerHTML = '';
            const startMsg = document.createElement('div');
            startMsg.className = 'message system';
            startMsg.innerHTML = '<div class="avatar"><i class="fas fa-robot"></i></div><div class="bubble">Chat history cleared.</div>';
            messagesContainer.appendChild(startMsg);
        }
    }

    function showTyping(show) {
        let indicator = document.getElementById('typing-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'typing-indicator';
            indicator.className = 'typing-indicator';
            indicator.innerHTML = `
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            `;
            messagesContainer.appendChild(indicator);
        }
        indicator.style.display = show ? 'flex' : 'none';
        scrollToBottom();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function formatText(text) {
        if (typeof marked !== 'undefined') {
            // Configure marked for custom renderers if needed
            // Simple hook for mermaid
            const renderer = new marked.Renderer();
            const originalCode = renderer.code.bind(renderer);

            renderer.code = function (code, language, escaped) {
                if (language === 'mermaid') {
                    return `<div class="mermaid">${code}</div>`;
                }
                return originalCode(code, language, escaped);
            };

            marked.use({ renderer });
            return marked.parse(text);
        }
        return text.replace(/\n/g, '<br>');
    }
});
