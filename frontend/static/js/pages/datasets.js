
document.addEventListener('DOMContentLoaded', () => {
    // -- Elements --
    const listContainer = document.getElementById('dataset-list');

    // Top Nav
    const topNavBtns = document.querySelectorAll('.top-nav-bar .nav-pill');
    const keyViews = {
        'view-sources': document.getElementById('view-sources'),
        'view-viz': document.getElementById('view-viz'),
        'view-roles': document.getElementById('view-roles')
    };

    // Sources Nav
    const tabLocal = document.getElementById('tab-local');
    const tabHub = document.getElementById('tab-hub');
    const listHubContainer = document.getElementById('hub-container');
    const listHub = document.getElementById('hub-list');
    const filterPills = document.querySelectorAll('.hub-filter-bar .filter-pill');

    // Role View Logic
    const roleEmpty = document.getElementById('role-empty');
    const roleContent = document.getElementById('role-content');
    const vizEmpty = document.getElementById('viz-empty');
    const vizContent = document.getElementById('viz-content');
    const datasetNameEl = document.getElementById('dataset-name');

    // Refresh button
    document.getElementById('refresh-list-btn').addEventListener('click', loadDatasets);

    // Initial Load
    loadDatasets();

    // -- Top Navigation Switching --
    // -- Top Navigation Switching --
    topNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update Nav State
            topNavBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update View State: Explicitly handle display property to override inline styles
            Object.values(keyViews).forEach(v => {
                v.classList.remove('active');
                v.style.display = 'none';
            });

            const targetId = btn.getAttribute('data-target');
            const targetView = keyViews[targetId];
            if (targetView) {
                targetView.classList.add('active');
                // Use flex for sources/roles to maintain layout, block for viz
                if (targetId === 'view-viz') {
                    targetView.style.display = 'block';
                } else {
                    targetView.style.display = 'flex';
                }
            }
        });
    });

    // -- App Tools Dropdown --
    const appToolsBtn = document.querySelector('.dropdown-sim .btn');
    const appToolsContent = document.querySelector('.dropdown-sim .dropdown-content');
    if (appToolsBtn && appToolsContent) {
        appToolsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = appToolsContent.style.display === 'none';
            appToolsContent.style.display = isHidden ? 'block' : 'none';
        });

        // Close on outside click
        document.addEventListener('click', () => {
            appToolsContent.style.display = 'none';
        });
    }

    // -- Role Switching (Sub-level) --
    const roleBtns = document.querySelectorAll('.role-selector .tab-btn');
    const panels = document.querySelectorAll('.role-panel');

    roleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            roleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            panels.forEach(p => p.style.display = 'none');
            const role = btn.getAttribute('data-role');
            const targetPanel = document.getElementById(`panel-${role}`);
            if (targetPanel) targetPanel.style.display = 'block';

            // Trigger Actions
            triggerRoleLoad(role);
        });
    });

    // -- Sub-Tab Switching Logic --
    const subTabs = document.querySelectorAll('.sub-tab');
    subTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const panel = tab.closest('.role-panel');
            if (!panel) return;
            panel.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
            panel.querySelectorAll('.sub-view').forEach(v => v.style.display = 'none');
            tab.classList.add('active');
            const target = document.getElementById(tab.getAttribute('data-target'));
            if (target) target.style.display = 'block';
        });
    });

    // -- Sidebar/Library Switch (Local vs Hub) --
    tabLocal.addEventListener('click', () => {
        tabLocal.classList.add('active');
        tabHub.classList.remove('active');
        listContainer.style.display = 'grid'; // Grid for local files
        listHubContainer.style.display = 'none';
        // Reset filters
        filterPills.forEach(p => p.classList.remove('active'));
        filterPills[0].classList.add('active');
    });

    tabHub.addEventListener('click', () => {
        tabHub.classList.add('active');
        tabLocal.classList.remove('active');
        listContainer.style.display = 'none';
        listHubContainer.style.display = 'flex'; // Container flex
        loadHubDatasets('all');
    });

    // -- Hub Filter Logic --
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const source = pill.getAttribute('data-source');
            loadHubDatasets(source);
        });
    });

    async function triggerRoleLoad(role) {
        if (!window.currentDataset) return;
        if (role === 'scientist') setupScientistView(window.currentDataset);
        if (role === 'architect') loadSchema(window.currentDataset);
        if (role === 'entry') loadEntryForm(window.currentDataset);
        if (role === 'analyst') setupAnalystView(window.currentDataset);
        if (role === 'mlops') setupMlOpsView(window.currentDataset);
    }

    // -- Hub Loading --
    async function loadHubDatasets(source = 'all') {
        listHub.innerHTML = '<div class="loading">Loading Cloud Resources...</div>';
        try {
            const res = await fetch(`/api/v1/datasets/public?source=${source}`);
            const data = await res.json();
            listHub.innerHTML = '';
            listHub.style.display = 'grid';
            listHub.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            listHub.style.gap = '1rem';

            if (data.length === 0) {
                listHub.innerHTML = '<div class="empty-state">No datasets found for this source.</div>';
                return;
            }

            data.forEach(d => {
                const item = document.createElement('div');
                item.className = 'hub-item card'; // Use card style
                item.style.border = '1px solid var(--border-color)';
                item.style.padding = '1rem';
                item.style.display = 'flex';
                item.style.flexDirection = 'column';
                item.style.gap = '0.5rem';

                let sourceBadge = '';
                if (d.source === 'Hugging Face') sourceBadge = '<span class="badge text-xs" style="background:#fff59d; color:#827717;">🤗 HF</span>';
                else if (d.source === 'Kaggle') sourceBadge = '<span class="badge text-xs" style="background:#e1f5fe; color:#0277bd;">Kaggle</span>';
                else sourceBadge = '<span class="badge text-xs" style="background:#e8f5e9; color:#2e7d32;">NeuroForge</span>';

                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            <i class="fas fa-globe text-blue-500"></i> ${sourceBadge}
                        </div>
                         <button class="btn small secondary" title="Download to Local workspace"><i class="fas fa-download"></i></button>
                    </div>
                    <strong>${d.name}</strong>
                    <small class="text-muted">${d.category} • ${d.size}</small>
                    <p class="text-xs text-muted" style="margin:0;">${d.desc}</p>
                `;
                item.querySelector('button').onclick = () => downloadPublic(d.id);
                listHub.appendChild(item);
            });
        } catch (e) { listHub.innerHTML = 'Error loading hub.'; }
    }

    async function downloadPublic(id) {
        if (!confirm("Download this dataset to your workspace?")) return;
        try {
            const res = await fetch('/api/v1/datasets/public/download', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                alert("Downloaded successfully!");
                loadDatasets();
                tabLocal.click();
            }
        } catch (e) { alert("Download failed"); }
    }

    // -- Upload Button --
    const newBtn = document.querySelector('.header-actions .btn.primary');
    if (newBtn) {
        newBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.jsonl,.txt,.csv,.pdf';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
                    try {
                        const res = await fetch('/api/v1/datasets/upload', {
                            method: 'POST', body: formData
                        });
                        if (res.ok) {
                            alert("Upload Successful!");
                            loadDatasets();
                        } else {
                            alert("Upload Failed");
                        }
                    } catch (err) {
                        console.error(err);
                        alert("Error uploading file.");
                    } finally {
                        newBtn.innerHTML = '<i class="fas fa-plus"></i> New Dataset';
                    }
                }
            };
            input.click();
        });
    }

    // -- DELETE Logic --
    const delBtn = document.getElementById('btn-delete');
    if (delBtn) {
        delBtn.addEventListener('click', async () => {
            if (!window.currentDataset) return;
            if (confirm(`Are you sure you want to delete ${window.currentDataset}?`)) {
                await fetch(`/api/v1/datasets/${window.currentDataset}`, { method: 'DELETE' });
                window.currentDataset = null;
                showEmptyState();
                loadDatasets();
            }
        });
    }

    // -- EXPORT Logic --
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            if (!window.currentDataset) return;
            // Go to download URL
            window.location.href = `/api/v1/datasets/${window.currentDataset}/download?format=csv`;
        });
    }

    const cloudExportBtn = document.getElementById('btn-cloud-export');
    if (cloudExportBtn) {
        cloudExportBtn.addEventListener('click', async () => {
            if (!window.currentDataset) return alert("Select a dataset first.");
            cloudExportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pushing...';

            try {
                const res = await fetch('/api/v1/datasets/cloud/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: window.currentDataset, platform: 'NeuroForge Cloud' })
                });
                const json = await res.json();

                if (res.ok) {
                    alert(json.message);
                } else {
                    alert("Upload failed: " + json.error);
                }
            } catch (e) {
                alert("Network error.");
            } finally {
                cloudExportBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Push to Cloud';
            }
        });
    }

    // -- Helpers --
    function showEmptyState() {
        if (roleEmpty) roleEmpty.style.display = 'flex';
        if (roleContent) roleContent.style.display = 'none';
        if (vizEmpty) vizEmpty.style.display = 'flex';
        if (vizContent) vizContent.style.display = 'none';
        topNavBtns[0].click(); // Go back to sources
    }


    document.getElementById('btn-index').addEventListener('click', async () => {
        if (!window.currentDataset) return;
        const btn = document.getElementById('btn-index');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Indexing...';

        try {
            const res = await fetch(`/api/v1/datasets/${window.currentDataset}/index`, { method: 'POST' });
            const json = await res.json();
            if (res.ok) {
                alert(`Indexed successfully! ${json.chunks_processed} chunks processed.`);
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (e) {
            alert('Failed to index.');
        } finally {
            btn.innerHTML = originalHtml;
        }
    });

    // -- ROLE: Data Entry --
    let ingestInterval = null;
    let ingestCount = 0;

    document.getElementById('toggle-ingest').addEventListener('change', (e) => {
        const stats = document.getElementById('ingest-stats');
        const counter = document.getElementById('ingest-count');

        if (e.target.checked) {
            if (!window.currentDataset) {
                alert("Select a dataset first.");
                e.target.checked = false;
                return;
            }
            stats.style.display = 'block';
            ingestCount = 0;
            counter.innerText = ingestCount;

            ingestInterval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/v1/datasets/${window.currentDataset}/ingest_sim`, { method: 'POST' });
                    const json = await res.json();
                    if (res.ok) {
                        ingestCount++;
                        counter.innerText = ingestCount;
                        // Blink effect
                        stats.style.opacity = 0.5;
                        setTimeout(() => stats.style.opacity = 1, 200);

                        // Update stats occasionally
                        if (ingestCount % 5 === 0) loadGenericStats(window.currentDataset);
                    }
                } catch (err) { console.error("Ingest error", err); }
            }, 2000);

        } else {
            stats.style.display = 'none';
            if (ingestInterval) clearInterval(ingestInterval);
            ingestInterval = null;
            // Final refresh
            loadPreview(window.currentDataset);
            loadGenericStats(window.currentDataset);
        }
    });

    async function loadEntryForm(filename) {
        // Need columns first
        const formContainer = document.getElementById('entry-form-fields');
        formContainer.innerHTML = '<p>Loading schema...</p>';
        try {
            const res = await fetch(`/api/v1/datasets/${filename}/schema`);
            const schema = await res.json();
            if (Array.isArray(schema)) {
                formContainer.innerHTML = '';
                schema.forEach(col => {
                    const div = document.createElement('div');
                    div.className = 'form-group';
                    // Simple input for everything for now
                    div.innerHTML = `
                        <label>${col.column} <small>(${col.type})</small></label>
                        <input type="text" name="${col.column}" class="form-input" placeholder="Value for ${col.column}">
                    `;
                    formContainer.appendChild(div);
                });
            }
        } catch (e) { console.error(e); }
    }

    document.getElementById('btn-add-row').addEventListener('click', async () => {
        if (!window.currentDataset) return;
        const inputs = document.querySelectorAll('#entry-form-fields input');
        const rowData = {};
        inputs.forEach(input => rowData[input.name] = input.value);

        try {
            const res = await fetch(`/api/v1/datasets/${window.currentDataset}/row`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rowData)
            });
            const json = await res.json();
            if (res.ok) {
                alert(`Row added! Total rows: ${json.rows}`);
                inputs.forEach(i => i.value = ''); // clear
                // refresh preview
                loadPreview(window.currentDataset);
                loadGenericStats(window.currentDataset);
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (e) { alert("Failed to add row"); }
    });

    // -- ROLE: Data Engineer --
    document.getElementById('btn-run-clean').addEventListener('click', async () => {
        if (!window.currentDataset) return;
        const ops = [];
        if (document.getElementById('clean-dedup').checked) ops.push({ type: 'drop_duplicates' });
        if (document.getElementById('clean-dropna').checked) ops.push({ type: 'drop_na' });
        if (document.getElementById('clean-fillna').checked) ops.push({ type: 'fill_na', value: 0 });

        const btn = document.getElementById('btn-run-clean');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            const res = await fetch(`/api/v1/datasets/${window.currentDataset}/clean`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operations: ops })
            });
            const json = await res.json();

            const resultBox = document.getElementById('clean-results');
            resultBox.style.display = 'block';
            if (res.ok) {
                resultBox.className = 'results-box success';
                resultBox.innerHTML = `
                    <strong>Success!</strong> New file created: ${json.new_file}<br>
                    <ul>${json.report.map(r => `<li>${r}</li>`).join('')}</ul>
                `;
                loadDatasets(); // Refresh to see new file
            } else {
                resultBox.className = 'results-box error';
                resultBox.innerText = json.error;
            }
        } catch (e) { console.error(e); }
        btn.innerHTML = '<i class="fas fa-magic"></i> Run Auto-Clean';
    });

    // -- ROLE: Data Analyst --
    async function setupAnalystView(filename) {
        // Load columns for viz dropdown
        try {
            const res = await fetch(`/api/v1/datasets/${filename}/schema`);
            const schema = await res.json();
            const select = document.getElementById('viz-column-select');
            select.innerHTML = '<option value="">Select column...</option>';
            if (Array.isArray(schema)) {
                schema.forEach(col => {
                    const opt = document.createElement('option');
                    opt.value = col.column;
                    opt.innerText = col.column;
                    select.appendChild(opt);
                });
            }
        } catch (e) { }
    }

    document.getElementById('btn-auto-insight').addEventListener('click', async () => {
        const resBox = document.getElementById('insights-result');
        resBox.innerHTML = 'Analyzing patterns...';
        try {
            const res = await fetch(`/api/v1/datasets/${window.currentDataset}/insights`);
            const data = await res.json();

            resBox.innerHTML = '';
            if (Array.isArray(data)) {
                data.forEach(item => {
                    const idx = document.createElement('div');
                    idx.className = `insight-item ${item.type}`;
                    idx.innerHTML = `<i class="fas fa-lightbulb"></i> ${item.text}`;
                    resBox.appendChild(idx);
                });
            } else {
                resBox.innerText = data.error || 'No insights found.';
            }
        } catch (e) { resBox.innerText = 'Analysis failed.'; }
    });

    document.getElementById('btn-run-query').addEventListener('click', async () => {
        const query = document.getElementById('sql-query').value;
        const resBox = document.getElementById('query-results');
        resBox.innerHTML = '<p>Running...</p>';
        try {
            const res = await fetch(`/api/v1/datasets/${window.currentDataset}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const json = await res.json();
            if (json.data) {
                // Render table
                const cols = json.columns;
                let html = '<table><thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
                html += json.data.map(row => '<tr>' + cols.map(c => `<td>${row[c]}</td>`).join('') + '</tr>').join('');
                html += '</tbody></table>';
                resBox.innerHTML = html;
            } else {
                resBox.innerHTML = `<p class="error">${json.error}</p>`;
            }
        } catch (e) { resBox.innerHTML = 'Error executing query'; }
    });

    document.getElementById('viz-column-select').addEventListener('change', async (e) => {
        const col = e.target.value;
        if (!col) return;

        try {
            const res = await fetch(`/api/v1/datasets/${window.currentDataset}/distribution/${col}`);
            const data = await res.json();

            if (data.error) return alert(data.error);

            const ctx = document.getElementById('analystChart').getContext('2d');
            if (window.analystChartInstance) window.analystChartInstance.destroy();

            window.analystChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: col,
                        data: data.values,
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

        } catch (e) { console.error(e); }
    });

    // -- ROLE: Architect --
    async function loadSchema(filename) {
        const tbody = document.querySelector('#schema-table tbody');
        tbody.innerHTML = '<tr><td colspan="6">Loading schema...</td></tr>';
        try {
            const res = await fetch(`/api/v1/datasets/${filename}/schema`);
            const schema = await res.json();
            if (Array.isArray(schema)) {
                tbody.innerHTML = schema.map(r => `
                    <tr id="row-${r.column}">
                        <td><b class="col-name">${r.column}</b></td>
                        <td>${r.type}</td>
                        <td>${r.non_null}</td>
                        <td>${r.unique}</td>
                        <td><code>${r.example}</code></td>
                        <td>
                            <button class="btn small secondary icon-only" onclick="enableEdit('${r.column}')" title="Rename"><i class="fas fa-edit"></i></button>
                        </td>
                    </tr>
                `).join('');

                // Expose helper to window for inline onclick
                window.enableEdit = (colName) => {
                    const row = document.getElementById(`row-${colName}`);
                    const nameCell = row.querySelector('.col-name');
                    const currentName = nameCell.innerText;
                    nameCell.innerHTML = `
                        <input type="text" id="edit-${colName}" value="${currentName}" class="form-input small" style="width:120px;">
                        <button class="btn small primary icon-only" onclick="saveRename('${colName}')"><i class="fas fa-check"></i></button>
                        <button class="btn small secondary icon-only" onclick="loadSchema('${window.currentDataset}')"><i class="fas fa-times"></i></button>
                    `;
                };

                window.saveRename = async (oldName) => {
                    const newName = document.getElementById(`edit-${oldName}`).value;
                    if (!newName || newName === oldName) return loadSchema(window.currentDataset);

                    try {
                        const res = await fetch(`/api/v1/datasets/${window.currentDataset}/schema/rename`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ old_name: oldName, new_name: newName })
                        });
                        const json = await res.json();
                        if (res.ok) {
                            alert("Column renamed!");
                            loadSchema(window.currentDataset);
                        } else {
                            alert("Error: " + json.error);
                        }
                    } catch (e) { alert("Failed to rename"); }
                };

            }
        } catch (e) { tbody.innerHTML = '<tr><td colspan="6">Error loading schema</td></tr>'; }
    }

    // -- ROLE: MLOps --
    function setupMlOpsView(filename) {
        // Populate file drop down for drift
        const sel = document.getElementById('drift-file-select');
        sel.innerHTML = '<option value="">Select baseline...</option>';
        if (window.allFiles) {
            window.allFiles.forEach(f => {
                if (f.name !== filename) {
                    const opt = document.createElement('option');
                    opt.value = f.name;
                    opt.innerText = f.name;
                    sel.appendChild(opt);
                }
            });
        }
    }

    document.getElementById('btn-create-version').addEventListener('click', async () => {
        const tag = document.getElementById('version-tag').value || 'snapshot';
        if (confirm(`Create version ${tag}?`)) {
            const res = await fetch(`/api/v1/datasets/${window.currentDataset}/version`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag })
            });
            const json = await res.json();
            if (res.ok) {
                alert(`Version created: ${json.new_file}`);
                loadDatasets();
            } else {
                alert(json.error);
            }
        }
    });

    document.getElementById('btn-check-drift').addEventListener('click', async () => {
        const fileB = document.getElementById('drift-file-select').value;
        if (!fileB) return alert("Select a baseline file");

        const resBox = document.getElementById('drift-results');
        resBox.style.display = 'block';
        resBox.innerHTML = 'Checking drift...';

        const res = await fetch(`/api/v1/datasets/drift/check?file_a=${window.currentDataset}&file_b=${fileB}`);
        const json = await res.json();

        let html = '<h6>Drift Report</h6><ul>';
        for (const [col, stats] of Object.entries(json)) {
            const color = stats.status === 'DRIFT DETECTED' ? 'red' : 'green';
            html += `<li style="color:${color}">
                <b>${col}</b>: ${stats.status} (Drift: ${stats.drift_pct}%)<br>
                <small>Mean A: ${stats.mean_a}, Mean B: ${stats.mean_b}</small>
            </li>`;
        }
        html += '</ul>';
        resBox.innerHTML = html;
    });

    // -- ROLE: DBA --
    document.getElementById('btn-backup').addEventListener('click', async () => {
        if (confirm("Trigger immediate backup?")) {
            const res = await fetch(`/api/v1/datasets/${window.currentDataset}/backup`, { method: 'POST' });
            const json = await res.json();
            if (res.ok) {
                document.getElementById('dba-last-backup').innerText = new Date().toLocaleTimeString();
                alert(`Backup saved to ${json.backup_file}`);
            } else {
                alert(json.error);
            }
        }
    });

    // -- ROLE: Data Scientist --
    const slider = document.getElementById('split-ratio');
    slider.addEventListener('input', (e) => {
        const val = Math.round(e.target.value * 100);
        document.getElementById('split-val').innerText = `${val}% Train / ${100 - val}% Test`;
    });

    async function setupScientistView(filename) {
        loadScientificStats(filename);
        // Load Targets
        try {
            const res = await fetch(`/api/v1/datasets/${filename}/schema`);
            const schema = await res.json();
            const select = document.getElementById('train-target-col');
            select.innerHTML = '<option value="">Select Target Variable...</option>';
            if (Array.isArray(schema)) {
                schema.forEach(col => {
                    const opt = document.createElement('option');
                    opt.value = col.column;
                    opt.innerText = col.column;
                    select.appendChild(opt);
                });
            }
        } catch (e) { }
    }

    document.getElementById('btn-train-sim').addEventListener('click', async () => {
        const target = document.getElementById('train-target-col').value;
        if (!target) return alert("Please select a target variable first.");

        const resBox = document.getElementById('train-results');
        resBox.classList.remove('hidden');
        resBox.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Training Baseline Model...</p>';

        const res = await fetch(`/api/v1/datasets/${window.currentDataset}/train_sim`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target })
        });
        const json = await res.json();

        if (json.status === 'success') {
            let html = `<h6>${json.model_type}</h6>`;
            html += `<p class="success">Final Accuracy: <b>${json.final_accuracy}</b></p>`;
            html += `<div class="epochs-list">`;
            json.history.forEach(h => {
                html += `<div><span>Epoch ${h.epoch}</span> <span>L: ${h.loss} A: ${h.accuracy}</span></div>`;
            });
            html += `</div>`;
            resBox.innerHTML = html;
        } else {
            resBox.innerText = json.error;
        }
    });

    document.getElementById('btn-run-split').addEventListener('click', async () => {
        if (!window.currentDataset) return;
        const btn = document.getElementById('btn-run-split');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Splitting...';

        try {
            const res = await fetch(`/api/v1/datasets/${window.currentDataset}/split`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ratio: slider.value })
            });
            const json = await res.json();
            const resultBox = document.getElementById('split-results');
            resultBox.style.display = 'block';

            if (res.ok) {
                resultBox.className = 'results-box success';
                resultBox.innerHTML = `
                    <strong>Split Created!</strong><br>
                    Train Set: ${json.train_file} (${json.train_count} rows)<br>
                    Test Set: ${json.test_file} (${json.test_count} rows)
                `;
                loadDatasets();
            } else {
                resultBox.className = 'results-box error';
                resultBox.innerText = json.error;
            }
        } catch (e) { console.error(e); }
        btn.innerHTML = '<i class="fas fa-cut"></i> Create Splits';
    });

    // --- Helper Functions ---

    async function loadDatasets() {
        listContainer.innerHTML = '<li class="list-item placeholder">Loading...</li>';
        try {
            const res = await fetch('/api/v1/datasets');
            const files = await res.json();
            window.allFiles = files; // Store for MLOps dropdown
            listContainer.innerHTML = '';

            if (files.length === 0) {
                listContainer.innerHTML = '<li class="list-item placeholder">No datasets found.</li>';
                return;
            }

            files.forEach(f => {
                const li = document.createElement('li');
                li.className = 'list-item';
                if (window.currentDataset === f.name) li.classList.add('active');

                let iconClass = 'fa-file';
                const lower = f.name.toLowerCase();
                if (lower.endsWith('.json')) iconClass = 'fa-file-code';
                if (lower.endsWith('.csv')) iconClass = 'fa-file-csv';

                li.innerHTML = `
                    <div class="item-icon"><i class="fas ${iconClass}"></i></div>
                    <div class="item-details">
                        <span class="title">${f.name}</span>
                        <span class="subtitle">${f.size}</span>
                    </div>
                `;
                li.addEventListener('click', () => selectDataset(f.name, li));
                listContainer.appendChild(li);
            });
        } catch (e) {
            listContainer.innerHTML = '<li class="list-item error">Failed to load datasets.</li>';
        }
    }

    async function selectDataset(filename, liElement) {
        window.currentDataset = filename;
        window.currentStats = null; // reset cache

        document.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
        if (liElement) liElement.classList.add('active');

        // Update Empty States
        const roleEmpty = document.getElementById('role-empty');
        const roleContent = document.getElementById('role-content');
        const vizEmpty = document.getElementById('viz-empty');
        const vizContent = document.getElementById('viz-content');
        const wkBadge = document.getElementById('wk-status-badge');

        if (roleEmpty) roleEmpty.style.display = 'none';
        if (roleContent) roleContent.style.display = 'flex';
        if (vizEmpty) vizEmpty.style.display = 'none';
        if (vizContent) vizContent.style.display = 'block';

        if (wkBadge) {
            wkBadge.innerText = 'Active';
            wkBadge.className = 'badge success';
        }

        const nameEl = document.getElementById('dataset-name');
        if (nameEl) nameEl.innerText = filename;

        // Reset Views
        resetViews();

        // Load Data
        loadPreview(filename);
        loadGenericStats(filename);
        loadUtilization(filename);

        // Auto-Switch to Role View
        const roleTabBtn = document.querySelector('.nav-pill[data-target="view-roles"]');
        if (roleTabBtn) roleTabBtn.click();

        // If we are already on a specific tab, refresh that tab's data
        const activeRoleBtn = document.querySelector('.role-selector .tab-btn.active');
        if (activeRoleBtn) {
            activeRoleBtn.click(); // re-trigger load
        }
    }

    function resetViews() {
        document.getElementById('entry-form-fields').innerHTML = '';
        document.getElementById('viz-column-select').innerHTML = '';
        if (window.analystChartInstance) {
            window.analystChartInstance.destroy();
            window.analystChartInstance = null;
        }
        document.getElementById('schema-table').querySelector('tbody').innerHTML = '';
    }

    async function loadPreview(filename) {
        const tbody = document.querySelector('#preview-table tbody');
        const thead = document.querySelector('#preview-table thead');
        tbody.innerHTML = '<tr><td>Loading preview...</td></tr>';

        try {
            const res = await fetch(`/api/v1/datasets/${filename}/preview`);
            const data = await res.json();

            if (data.error) {
                tbody.innerHTML = `<tr><td class="error">${data.error}</td></tr>`;
                return;
            }

            if (Array.isArray(data) && data.length > 0) {
                // headers
                const columns = Object.keys(data[0]);
                thead.innerHTML = '<tr>' + columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
                // rows
                tbody.innerHTML = data.map(row => {
                    return '<tr>' + columns.map(c => `<td>${truncate(row[c])}</td>`).join('') + '</tr>';
                }).join('');
            } else {
                tbody.innerHTML = '<tr><td>No data available or empty file.</td></tr>';
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td>Error loading preview.</td></tr>';
        }
    }

    async function loadGenericStats(filename) {
        try {
            const res = await fetch(`/api/v1/datasets/${filename}/stats`);
            const stats = await res.json();

            if (stats.error) return;

            // Overview Panel Stats
            document.getElementById('stat-rows').innerText = stats.rows;
            document.getElementById('stat-cols').innerText = stats.columns ? stats.columns.length : '-';
            if (document.getElementById('stat-size')) document.getElementById('stat-size').innerText = stats.size || '-';

            // Visualization Tab Stats
            if (document.getElementById('viz-stat-rows')) document.getElementById('viz-stat-rows').innerText = stats.rows;
            if (document.getElementById('viz-stat-cols')) document.getElementById('viz-stat-cols').innerText = stats.columns ? stats.columns.length : '-';
            if (document.getElementById('viz-stat-size')) document.getElementById('viz-stat-size').innerText = stats.size || '-';

            window.currentStats = stats;
        } catch (e) { console.error(e); }
    }

    function loadScientificStats(filename) {
        const container = document.getElementById('scientific-stats');
        // Simple reuse of generic stats for now, could be deeper
        if (!window.currentStats) return;

        const s = window.currentStats;
        let html = `
            <div class="stat-card">
                <h6>Total Rows</h6>
                <span>${s.rows}</span>
            </div>
             <div class="stat-card">
                <h6>Columns</h6>
                <span>${s.columns ? s.columns.length : 0}</span>
            </div>
        `;
        if (s.description) {
            html += `
             <div class="stat-card full-width">
                <h6>Distribution Summary</h6>
                <pre>${JSON.stringify(s.description, null, 2)}</pre>
            </div>
            `;
        }
        container.innerHTML = html;
    }

    async function loadUtilization(filename) {
        try {
            const res = await fetch(`/api/v1/datasets/${filename}/utilization`);
            const data = await res.json();

            if (data.error) return;

            // Update Text Stats
            if (document.getElementById('viz-last-access'))
                document.getElementById('viz-last-access').innerText = data.last_accessed;

            if (document.getElementById('util-score'))
                document.getElementById('util-score').innerText = `${data.utilization_score}%`;

            // Render Integrations
            const list = document.getElementById('integration-list');
            if (list && data.integrations) {
                list.innerHTML = data.integrations.map(i => {
                    const color = i.status === 'active' || i.status === 'connected' ? 'green' : 'gray';
                    const icon = i.type === 'internal' ? 'fa-cube' : 'fa-globe';
                    return `
                        <div class="integration-chip" style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#f3f4f6; border-radius:20px; font-size:0.85rem;">
                            <span class="dot" style="height:8px; width:8px; background:${color}; border-radius:50%;"></span>
                            <i class="fas ${icon} text-muted"></i>
                            <strong>${i.name}</strong>
                        </div>
                    `;
                }).join('');
            }

        } catch (e) { console.error('Util load failed', e); }
    }

    function truncate(str) {
        if (typeof str !== 'string') return str;
        return str.length > 50 ? str.substring(0, 50) + '...' : str;
    }

    function showEmptyState() {
        emptyState.style.display = 'flex';
        mainView.style.display = 'none';
        document.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
    }
});
