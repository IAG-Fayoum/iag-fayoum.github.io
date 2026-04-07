/**
 * nav.js — IAG System Unified Navigation (v1.0)
 * Builds bottom nav + side menu based on role from localStorage
 * Included in every page after auth.js
 */
(function () {

  var NAV = {
    'مدير': [
      { href: 'admin.html',        icon: 'home',           label: 'الرئيسية'  },
      { href: 'distribution.html', icon: 'bar-chart-2',    label: 'المؤشرات'  },
      { href: 'settings.html',     icon: 'clipboard-list', label: 'إجراءات'   },
      { href: 'forms.html',        icon: 'file-text',      label: 'النماذج'   },
    ],
    'منسق': [
      { href: 'coordinator.html',  icon: 'home',           label: 'الرئيسية'  },
      { href: 'distribution.html', icon: 'bar-chart-2',    label: 'المؤشرات'  },
      { href: 'settings.html',     icon: 'clipboard-list', label: 'إجراءات'   },
      { href: 'forms.html',        icon: 'file-text',      label: 'النماذج'   },
    ],
    'default': [
      { href: 'employee.html',     icon: 'home',              label: 'الرئيسية'   },
      { href: 'findings.html',     icon: 'shield-alert',      label: 'الملاحظات'  },
      { href: 'forms.html',        icon: 'file-text',         label: 'النماذج'    },
    ]
  };

  function getItems(role) {
    var r = (role || '').trim();
    if (r === 'مدير' || r === 'Admin') return NAV['مدير'];
    if (r === 'منسق')                  return NAV['منسق'];
    return NAV['default'];
  }

  function currentPage() {
    var path = window.location.pathname;
    var parts = path.split('/');
    var page = parts[parts.length - 1] || '';
    return page || 'index.html';
  }

  function buildBottomNav(items) {
    var nav = document.getElementById('bottom-nav');
    if (!nav) return;
    var page = currentPage();
    nav.innerHTML = items.map(function (item) {
      var active = (page === item.href) ? ' active' : '';
      return '<a href="' + item.href + '" class="nav-btn' + active + '">'
        + '<i data-lucide="' + item.icon + '"></i> ' + item.label
        + '</a>';
    }).join('');
    // Ensure nav is visible (forms.html starts with hidden class)
    nav.classList.remove('hidden');
  }

  function buildSideNav(items) {
    var nav = document.getElementById('side-nav');
    if (!nav) return;
    var page = currentPage();
    nav.innerHTML = items.map(function (item) {
      var isActive = (page === item.href);
      var cls = isActive
        ? 'flex items-center gap-3 p-3 rounded-lg bg-teal-600 text-white font-bold text-sm'
        : 'flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700 font-bold text-sm';
      return '<a href="' + item.href + '" class="' + cls + '">'
        + '<i data-lucide="' + item.icon + '" class="w-4 h-4"></i> ' + item.label
        + '</a>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    try {
      var userStr = localStorage.getItem('iag_user');
      if (!userStr) return; // guest — leave nav empty
      var user  = JSON.parse(userStr);
      var items = getItems(user.role);
      buildBottomNav(items);
      buildSideNav(items);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
      // silent fail — don't break page
    }
  });

})();
