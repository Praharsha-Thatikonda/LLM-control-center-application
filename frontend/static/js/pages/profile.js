document.addEventListener('DOMContentLoaded', () => {

    const navItems = document.querySelectorAll('.profile-nav-item');
    const sections = document.querySelectorAll('.profile-section');

    function switchSection(sectionId) {
        // Update Nav
        navItems.forEach(item => {
            if (item.dataset.section === sectionId) item.classList.add('active');
            else item.classList.remove('active');
        });

        // Update Content with Animation
        sections.forEach(sec => {
            if (sec.id === sectionId) {
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
            const section = item.dataset.section;
            switchSection(section);
        });
    });

    // Initialize
    switchSection('overview');

    // Simulate Form Saving
    window.saveProfile = function () {
        const btn = document.querySelector('.btn-save');
        if (!btn) return;

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-check"></i> Saved';
            btn.classList.remove('primary');
            btn.classList.add('success'); // Assuming you have a success class or style

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('success');
                btn.classList.add('primary');
                btn.disabled = false;
            }, 2000);
        }, 1200);
    };
});
