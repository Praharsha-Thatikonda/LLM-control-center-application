document.addEventListener('DOMContentLoaded', () => {
    // -- 1. Tab Navigation --
    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');

    // State
    let selectedModel = null;
    let selectedDataset = null;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none';
            });

            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            const target = document.getElementById(targetId);
            if (target) {
                target.classList.add('active');
                target.style.display = 'block';

                // Lazy Load
                if (targetId === 'models-tab') loadModels();
                if (targetId === 'datasets-tab') loadDatasets();
                if (targetId === 'checkpoints-tab') loadCheckpoints();
                if (targetId === 'history-tab') loadHistory();

                // Chart Resize Fix
                if (targetId === 'logs-tab' && lossChart) {
                    lossChart.resize();
                }
            }
        });
    });

    // -- 2. Models & Datasets Loading --
    async function loadModels() {
        // Only load if empty to preserve selection state visual if possible, or reload and re-highlight
        const grid = document.getElementById('training-models-list');
        if (grid.children.length > 1) return; // simple assumption check

        grid.innerHTML = '<div class="loading-placeholder">Loading Models...</div>';
        try {
            const res = await fetch('/api/v1/models/');
            const models = await res.json();
            if (models.length === 0) {
                grid.innerHTML = '<div class="empty-state">No models found. Go to Models Registry to add one.</div>';
                return;
            }

            grid.innerHTML = models.map(m => `
                <div class="model-detail-card selectable-card ${selectedModel?.id === m.id ? 'selected' : ''}" 
                     onclick="window.selectModel('${m.id}', '${m.name}', '${m.size}', event)">
                    <div class="card-header">
                        <h4><i class="fas fa-cube"></i> ${m.name}</h4>
                        <span class="badge ${m.source === 'custom' ? 'warning' : 'success'}">${m.source}</span>
                    </div>
                    <div class="card-body">
                         <div class="meta-grid">
                            <div class="meta-item"><strong>Format:</strong> ${m.format}</div>
                            <div class="meta-item"><strong>Size:</strong> ${m.size}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (e) { grid.innerHTML = 'Error loading models.'; }
    }

    async function loadDatasets() {
        const grid = document.getElementById('training-datasets-list');
        if (grid.children.length > 1) return;

        grid.innerHTML = '<div class="loading-placeholder">Loading Datasets...';
        try {
            const res = await fetch('/api/v1/datasets/');
            const files = await res.json();

            if (files.length === 0) {
                grid.innerHTML = '<div class="empty-state">No datasets found.</div>';
                return;
            }

            grid.innerHTML = files.map(f => `
                <div class="model-detail-card selectable-card ${selectedDataset === f.name ? 'selected' : ''}" 
                     onclick="window.selectDataset('${f.name}', '${f.size}', event)">
                    <div class="card-header">
                        <h4><i class="fas fa-database"></i> ${f.name}</h4>
                    </div>
                    <div class="card-body">
                         <div class="meta-grid">
                            <div class="meta-item"><strong>Size:</strong> ${f.size}</div>
                            <div class="meta-item"><strong>Created:</strong> ${new Date(f.created * 1000).toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (e) { grid.innerHTML = 'Error loading datasets.'; }
    }

    // -- 3. Selection Logic --
    window.selectModel = (id, name, size, e) => {
        selectedModel = { id, name, size };
        // UI
        document.querySelectorAll('#training-models-list .selectable-card').forEach(el => el.classList.remove('selected'));
        e.currentTarget.classList.add('selected');

        // Update Specs Tab
        document.getElementById('selected-model-specs').innerHTML = `
            <div class="spec-row"><strong>ID:</strong> ${id}</div>
            <div class="spec-row"><strong>Name:</strong> ${name}</div>
            <div class="spec-row"><strong>Size:</strong> ${size}</div>
            <div class="alert info mt-3"><i class="fas fa-info-circle"></i> Model selected for training.</div>
        `;

        updateSummary();
    };

    window.selectDataset = (name, size, e) => {
        selectedDataset = { name, size };
        // UI
        document.querySelectorAll('#training-datasets-list .selectable-card').forEach(el => el.classList.remove('selected'));
        e.currentTarget.classList.add('selected');

        updateSummary();
    };

    function updateSummary() {
        const sumText = document.getElementById('summary-text');
        if (selectedModel && selectedDataset) {
            sumText.innerHTML = `<span class="text-green-400">Ready!</span> Training <strong>${selectedModel.name}</strong> on <strong>${selectedDataset.name}</strong>`;
            sumText.parentElement.style.border = '1px solid var(--accent-success)';
        } else {
            const missing = [];
            if (!selectedModel) missing.push("Model");
            if (!selectedDataset) missing.push("Dataset");
            sumText.innerHTML = `Missing selection: ${missing.join(', ')}`;
            sumText.parentElement.style.border = '1px solid var(--border-color)';
        }
    }

    // NOTE: Add this CSS class via JS or ensure it's in CSS file.
    // For now, let's inject a style block for selection highlight
    const style = document.createElement('style');
    style.innerHTML = `
        .selectable-card { cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
        .selectable-card:hover { transform: translateY(-2px); border-color: var(--accent-primary); }
        .selectable-card.selected { border: 2px solid var(--accent-primary); background: rgba(59,130,246,0.1); }
    `;
    document.head.appendChild(style);


    // -- 4. Chart Initialization --
    const ctx = document.getElementById('lossChart');
    let lossChart;

    if (ctx && typeof Chart !== 'undefined') {
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

        lossChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Training Loss',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { display: true, grid: { display: false } },
                    y: {
                        display: true,
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                }
            }
        });
    }

    // -- 5. Training Control --
    const startBtn = document.getElementById('btn-start-training');
    const consoleOutput = document.querySelector('.console-output');

    let isTraining = false;
    let pollInterval;
    let step = 0;
    let currentJobId = null;

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (isTraining) stopTraining();
            else startTraining();
        });
    }

    async function startTraining() {
        if (isTraining) return;

        if (!selectedModel || !selectedDataset) {
            alert("Please select both a Model and a Dataset before training.");
            return;
        }

        // Auto-switch to Logs tab
        document.querySelector('[data-tab="logs-tab"]').click();

        try {
            const config = {
                model: selectedModel.id,
                dataset: selectedDataset.name,
                epochs: document.getElementById('conf-epochs').value,
                batch: document.getElementById('conf-batch').value,
                lr: document.getElementById('conf-lr').value
            };

            // 1. Create Job
            const res = await fetch('/api/v1/training/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            const data = await res.json();
            currentJobId = data.job_id;

            // 2. Start Job
            await fetch(`/api/v1/training/jobs/${currentJobId}/start`, { method: 'POST' });

            isTraining = true;
            updateButtonState(true);
            appendLog("System", `Job ${currentJobId} Started. Training ${selectedModel.name}...`, "info");

            // 3. Start Polling Loop
            pollInterval = setInterval(async () => {
                // Update System Tab Metrics if visible or in background
                await updateMetrics();

                // Simulate Loss Data
                step += 10;
                const baseLoss = 2.5 * Math.exp(-step / 500);
                const noise = (Math.random() - 0.5) * 0.2;
                const loss = Math.max(0, baseLoss + noise);

                if (step % 50 === 0) {
                    appendLog("Trainer", `Epoch 1/3 | Step ${step} | Loss: ${loss.toFixed(4)}`, "");
                }

                if (lossChart) {
                    if (lossChart.data.labels.length > 50) {
                        lossChart.data.labels.shift();
                        lossChart.data.datasets[0].data.shift();
                    }
                    lossChart.data.labels.push(step);
                    lossChart.data.datasets[0].data.push(loss);
                    lossChart.update('none');
                }

            }, 1000);

        } catch (e) {
            alert("Failed to start training: " + e);
        }
    }

    async function stopTraining() {
        if (!isTraining) return;

        await fetch('/api/v1/training/jobs/stop', { method: 'POST' });

        isTraining = false;
        clearInterval(pollInterval);
        updateButtonState(false);
        appendLog("System", "Training Stopped.", "warning");
    }

    function updateButtonState(training) {
        if (training) {
            startBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Training';
            startBtn.classList.replace('primary', 'destructive');
            startBtn.style.background = 'var(--accent-danger)';
        } else {
            startBtn.innerHTML = 'Start Training Run';
            startBtn.style.background = '';
            startBtn.classList.replace('destructive', 'primary');
        }
    }

    // -- 6. Metrics Polling --
    async function updateMetrics() {
        try {
            const res = await fetch('/api/v1/training/metrics');
            const m = await res.json();

            // GPU
            const gpuVal = document.getElementById('mon-gpu-val');
            if (gpuVal) {
                gpuVal.innerText = m.gpu_utilization + '%';
                document.getElementById('mon-gpu-bar').style.width = m.gpu_utilization + '%';
                document.getElementById('mon-vram-val').innerText = `VRAM: ${m.vram_usage}GB / ${m.vram_total}GB`;

                // RAM/CPU
                document.getElementById('mon-ram-val').innerText = m.ram_usage + ' GB';
                document.getElementById('mon-ram-bar').style.width = (m.ram_usage / 32 * 100) + '%';
                document.getElementById('mon-cpu-val').innerText = `CPU: ${m.cpu_utilization}%`;
            }
        } catch (e) { }
    }

    // -- 7. Load Checkpoints & History --
    // (Preserve functionality but adapt to IDs if changed, looks same)
    document.querySelector('.refresh-ckpt-btn')?.addEventListener('click', loadCheckpoints);
    document.querySelector('.refresh-hist-btn')?.addEventListener('click', loadHistory);

    async function loadCheckpoints() {
        const tbody = document.querySelector('#ckpt-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';

        try {
            const res = await fetch('/api/v1/training/checkpoints');
            const data = await res.json();
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No checkpoints found</td></tr>';
                return;
            }
            tbody.innerHTML = data.map(c => `<tr><td><strong>${c.name}</strong><br><span class="text-xs text-muted">${c.id}</span></td><td>${c.created}</td><td>${c.loss}</td><td><button class="btn sm secondary"><i class="fas fa-download"></i></button></td></tr>`).join('');
        } catch (e) { tbody.innerHTML = '<tr><td colspan="4" class="error">Error</td></tr>'; }
    }

    async function loadHistory() {
        const tbody = document.querySelector('#hist-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

        try {
            const res = await fetch('/api/v1/training/history');
            const data = await res.json();
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No history found</td></tr>';
                return;
            }
            tbody.innerHTML = data.map(h => `<tr><td>${h.id}</td><td>${h.model}</td><td><span class="badge ${h.status === 'Completed' ? 'success' : 'destructive'}">${h.status}</span></td><td>${h.duration}</td><td>${h.final_loss}</td></tr>`).join('');
        } catch (e) { tbody.innerHTML = '<tr><td colspan="5" class="error">Error</td></tr>'; }
    }

    function appendLog(source, message, type = "") {
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        if (type === 'info') line.style.color = '#60a5fa';
        if (type === 'success') line.style.color = '#4ade80';
        if (type === 'warning') line.style.color = '#facc15';

        const timestamp = new Date().toLocaleTimeString();
        const prefix = source ? `[${timestamp}] <strong>${source}</strong>: ` : `[${timestamp}] `;
        line.innerHTML = prefix + message;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
});
