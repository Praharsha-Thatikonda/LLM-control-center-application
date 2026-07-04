document.addEventListener('DOMContentLoaded', () => {
    // 1. Tab Navigation
    const navItems = document.querySelectorAll('.settings-nav li');
    const sections = document.querySelectorAll('.settings-section');

    function switchTab(tabName) {
        // Update Nav
        navItems.forEach(item => {
            if (item.dataset.tab === tabName) item.classList.add('active');
            else item.classList.remove('active');
        });

        // Update Content
        sections.forEach(sec => {
            if (sec.id === tabName + '-section') {
                sec.style.display = 'block';
                sec.classList.add('animate-fade-in');
            } else {
                sec.style.display = 'none';
                sec.classList.remove('animate-fade-in');
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });

    // Initialize first tab
    switchTab('general');

    // 2. Integration Toggles (Animation/Feedback)
    const toggles = document.querySelectorAll('.switch input');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const row = e.target.closest('.integration-item');
            if (e.target.checked) {
                row.classList.add('active');
                showToast('Integration Enabled', 'success');
            } else {
                row.classList.remove('active');
                showToast('Integration Disabled', 'info');
            }

            // Enable/Disable inputs
            const inputs = row.querySelectorAll('input[type="text"], input[type="password"]');
            inputs.forEach(inp => inp.disabled = !e.target.checked);
        });
    });

    // 3. Save Changes Mock
    window.saveSettings = () => {
        const btn = document.getElementById('save-btn');
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-check"></i> Saved';
            btn.classList.add('success');

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.classList.remove('success');
            }, 2000);

            showToast('Settings saved successfully.', 'success');
        }, 1000);
    };

    // Helper: Toast Notification Simulation
    function showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = msg;
        document.body.appendChild(toast);

        // CSS for toast would normally be in stylesheet, adding inline for safety
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '12px 24px';
        toast.style.background = type === 'success' ? 'var(--accent-success)' : '#3b82f6';
        toast.style.color = 'white';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.zIndex = '9999';
        toast.style.animation = 'slideIn 0.3s ease-out forwards';

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
