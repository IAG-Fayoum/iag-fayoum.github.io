lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    // Check Auth similar to other pages
    const user = localStorage.getItem('iag_user');
    if (!user) { window.location.href = 'index.html'; return; }
    
    const u = JSON.parse(user);
    document.getElementById('menu-user').textContent = u.name;
    document.getElementById('menu-role').textContent = u.role;

    // Load Initial Data
    loadReports();
});

function toggleMenu() {
    document.body.classList.toggle('menu-open');
}

function logout() {
    localStorage.removeItem('iag_user');
    localStorage.removeItem('iag_last_page');
    window.location.href = 'index.html';
}

function loadReports() {
    // Mock Data Loading (Replace with API call)
    // Simulating Loading state if needed
    
    // Set random numbers for demo based on selection
    const q = document.getElementById('f-quarter').value;
    
    const stats = {
        'Q1': { out: 120, in: 150, ach: 45 },
        'Q2': { out: 180, in: 200, ach: 60 },
        'Q3': { out: 90, in: 110, ach: 30 },
        'Q4': { out: 210, in: 250, ach: 85 }
    };

    const current = stats[q] || stats['Q1'];

    animateValue('val-outgoing', 0, current.out, 1000);
    animateValue('val-incoming', 0, current.in, 1000);
    animateValue('val-achievements', 0, current.ach, 1000);
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function downloadReport(type, format) {
    const year = document.getElementById('f-year').value;
    const q = document.getElementById('f-quarter').value;
    const typeName = type === 'tech' ? 'التقرير_الفني' : 'التقرير_المالي';
    
    alert(`جاري تحميل ${typeName}_${year}_${q}.${format}...`);
    // Here you would trigger the actual file download via API
}
