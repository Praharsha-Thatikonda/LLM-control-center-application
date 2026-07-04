document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

function initDashboard() {
    // 1. Simulate Real-time System Metrics
    setInterval(updateSystemMetrics, 2000);

    // 2. Initialize any charts (using Chart.js if available)
    initResourceChart();

    // 3. Load Dynamic Data (Mock)
    loadRecentActivity();
}

function updateSystemMetrics() {
    // Mock varying values
    const gpuTemp = 40 + Math.floor(Math.random() * 20); // 40-60C
    const vramUsage = 12 + Math.floor(Math.random() * 5); // 12-17GB
    const cpuLoad = 15 + Math.floor(Math.random() * 30); // 15-45%

    // Update Text Elements
    updateText('metric-gpu-temp', `${gpuTemp}°C`);
    updateText('metric-vram', `${vramUsage} GB / 24 GB`);
    updateText('metric-cpu', `${cpuLoad}%`);

    // Update Progress Bars
    updateBar('bar-vram', (vramUsage / 24) * 100);
    updateBar('bar-cpu', cpuLoad);
}

function updateText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

function updateBar(id, percent) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${percent}%`;
}

function initResourceChart() {
    const ctx = document.getElementById('resourceChart');
    if (!ctx) return;

    // Small sparkline or area chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['10s', '8s', '6s', '4s', '2s', 'Now'],
            datasets: [{
                label: 'GPU Load',
                data: [45, 42, 48, 55, 52, 50],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false, min: 0, max: 100 }
            },
            maintainAspectRatio: false
        }
    });
}

function loadRecentActivity() {
    const list = document.getElementById('recent-activity-list');
    if (!list) return;

    // Mock Data
    const activities = [
        { icon: 'fa-check', color: 'text-green-500', text: 'Training Job #TRN-092 completed successfully.', time: '10 mins ago' },
        { icon: 'fa-exclamation-triangle', color: 'text-yellow-500', text: 'System Warning: High VRAM usage detected during inference.', time: '1 hr ago' },
        { icon: 'fa-plus', color: 'text-blue-500', text: 'Added new dataset "Financial_Reports_Q3.jsonl".', time: '2 hrs ago' }
    ];

    list.innerHTML = activities.map(act => `
        <div class="activity-item" style="display:flex; gap:1rem; padding: 0.75rem 0; border-bottom: 1px solid #f1f5f9;">
            <div style="width:24px; text-align:center;"><i class="fas ${act.icon} ${act.color}"></i></div>
            <div style="flex:1;">
                <div style="font-size:0.9rem; color:var(--text-primary);">${act.text}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary);">${act.time}</div>
            </div>
        </div>
    `).join('');
}
