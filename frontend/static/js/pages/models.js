document.addEventListener('DOMContentLoaded', () => {
    // Tab Navigation
    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');

    // State
    let controlPollInterval = null;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            const target = document.getElementById(targetId);
            if (target) {
                target.classList.add('active');

                // Tab Specific Loads
                if (targetId === 'registry-tab') loadLocalModels();
                if (targetId === 'hub-tab') loadHub('hf'); // Default to HF
                if (targetId === 'control-tab') startControlPolling();
                else stopControlPolling();
            }
        });
    });

    // Initial Load
    loadLocalModels();

    // =========================================================================
    // 1. REGISTRY TAB
    // =========================================================================
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadLocalModels);

    // Import File Logic
    const uploadInput = document.getElementById('model-upload-input');
    if (uploadInput) {
        uploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!confirm(`Upload ${file.name} to local registry?`)) return;

            // Mock Upload
            const originalText = document.querySelector('button[onclick*="model-upload-input"]').innerHTML;
            document.querySelector('button[onclick*="model-upload-input"]').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

            try {
                // In a real scenario we'd use FormData
                const res = await fetch(`/api/v1/models/upload?name=${file.name}&size=${(file.size / 1024 / 1024).toFixed(2)}MB`, { method: 'POST' });
                const json = await res.json();
                if (res.ok) {
                    alert('Upload successful!');
                    loadLocalModels();
                } else {
                    alert('Upload failed: ' + json.error);
                }
            } catch (e) { alert('Network error'); }
            finally {
                document.querySelector('button[onclick*="model-upload-input"]').innerHTML = originalText;
            }
        });
    }

    async function loadLocalModels() {
        const grid = document.getElementById('local-models-grid');
        grid.innerHTML = '<div class="loading-placeholder">Loading...</div>';
        try {
            const res = await fetch('/api/v1/models/');
            const models = await res.json();

            // Populate Dropdown for Control Panel too
            const select = document.getElementById('ctrl-model-select');
            if (select) {
                select.innerHTML = '<option value="">Choose a model...</option>' +
                    models.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
            }

            if (models.length === 0) {
                grid.innerHTML = '<div class="empty-state">No models found. Import one!</div>';
                return;
            }

            grid.innerHTML = models.map(m => `
                <div class="model-detail-card">
                    <div class="card-header">
                        <h4><i class="fas fa-cube"></i> ${m.name}</h4>
                        <span class="badge success">${m.source === 'custom' ? 'Config' : 'Ready'}</span>
                    </div>
                    <div class="card-body">
                         <div class="meta-grid">
                            <div class="meta-item"><strong>Format:</strong> ${m.format}</div>
                            <div class="meta-item"><strong>Size:</strong> ${m.size}</div>
                            <div class="meta-item"><strong>Source:</strong> ${m.source}</div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn sm secondary"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn sm destructive" onclick="deleteModel('${m.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');

        } catch (e) { grid.innerHTML = '<p class="error">Failed to load registry.</p>'; }
    }

    window.deleteModel = async (id) => {
        if (!confirm("Delete this model?")) return;
        await fetch(`/api/v1/models/${id}`, { method: 'DELETE' });
        loadLocalModels();
    };

    // =========================================================================
    // 2. CLOUD HUB TAB
    // =========================================================================
    const hubFilterBtns = document.querySelectorAll('.filter-btn');
    let currentHubSource = 'hf';

    hubFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            hubFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentHubSource = btn.dataset.source;
            loadHub(currentHubSource);
        });
    });

    document.getElementById('hub-search-btn').addEventListener('click', () => {
        const q = document.getElementById('hub-search').value;
        loadHub(currentHubSource, q);
    });

    async function loadHub(source, query = '') {
        const grid = document.getElementById('hub-results-grid');
        grid.innerHTML = '<div class="loading-placeholder">Searching Cloud...</div>';

        // Map to existing endpoints
        let url = source === 'hf'
            ? `/api/v1/models/hf/search?q=${query}`
            : `/api/v1/models/ollama/library?q=${query}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (data.length === 0) {
                grid.innerHTML = '<div class="empty-state">No models found.</div>';
                return;
            }

            grid.innerHTML = data.map(m => `
                <div class="model-detail-card">
                    <div class="card-header">
                        <h4>${m.name}</h4>
                        <span class="badge" style="background:${source === 'hf' ? '#fff3e0' : '#e0f7fa'}">${source.toUpperCase()}</span>
                    </div>
                    <div class="card-body">
                        <p class="text-sm text-muted">${m.description || m.task || 'No description'}</p>
                    </div>
                    <div class="card-footer">
                        <button class="btn sm primary" onclick="alert('Download simulated for ${m.name}')"><i class="fas fa-download"></i> Download</button>
                    </div>
                </div>
             `).join('');

        } catch (e) { grid.innerHTML = 'Error loading hub.'; }
    }

    // =========================================================================
    // 3. CREATOR TAB
    // =========================================================================
    document.getElementById('btn-create-model').addEventListener('click', async () => {
        const name = document.getElementById('create-name').value;
        const arch = document.getElementById('create-arch').value;

        if (!name) return alert("Please enter a name");

        try {
            const res = await fetch('/api/v1/models/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, architecture: arch })
            });
            const json = await res.json();
            if (res.ok) {
                alert("Model scaffold created!");
                // Switch to registry to show it
                document.querySelector('[data-tab="registry-tab"]').click();
            } else {
                alert("Error: " + json.error);
            }
        } catch (e) { alert("Network error"); }
    });

    // =========================================================================
    // 4. CONTROL PANEL TAB
    // =========================================================================
    document.getElementById('btn-load').addEventListener('click', async () => {
        const id = document.getElementById('ctrl-model-select').value;
        const name = document.getElementById('ctrl-model-select').options[document.getElementById('ctrl-model-select').selectedIndex].text;
        if (!id) return alert("Select a model first");

        document.getElementById('btn-load').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        await fetch('/api/v1/models/control/load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name })
        });
        updateControlStatus(); // force immediate update
        document.getElementById('btn-load').innerHTML = '<i class="fas fa-play"></i> Load into Memory';
    });

    document.getElementById('btn-unload').addEventListener('click', async () => {
        await fetch('/api/v1/models/control/unload', { method: 'POST' });
        updateControlStatus();
    });

    function startControlPolling() {
        updateControlStatus();
        controlPollInterval = setInterval(updateControlStatus, 2000);
    }

    function stopControlPolling() {
        if (controlPollInterval) clearInterval(controlPollInterval);
    }

    async function updateControlStatus() {
        try {
            const res = await fetch('/api/v1/models/control/status');
            const data = await res.json();

            // Update UI
            const activeModel = data.active_model;
            const modelEl = document.getElementById('ctrl-active-model');
            const statusBadge = document.getElementById('ctrl-status-badge');

            if (activeModel.id) {
                modelEl.innerText = activeModel.name;
                statusBadge.innerText = 'Running';
                statusBadge.className = 'badge success';
            } else {
                modelEl.innerText = 'None';
                statusBadge.innerText = 'Idle';
                statusBadge.className = 'badge';
            }

            // VRAM Meter
            const vramBar = document.getElementById('ctrl-vram-bar');
            const vramText = document.getElementById('ctrl-vram-text');
            const pct = (activeModel.vram_usage / data.system_vram_total) * 100;

            vramBar.style.width = `${pct}%`;
            vramText.innerText = `${(activeModel.vram_usage / 1024).toFixed(1)} / ${(data.system_vram_total / 1024).toFixed(0)} GB`;

        } catch (e) { console.error("Poll error", e); }
    }

});
