/**
 * nav.js — IAG System Unified Navigation (v2.0)
 * Builds bottom nav + side menu based on role from localStorage.
 * Included in every page after auth.js.
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
      { href: 'employee.html',     icon: 'home',           label: 'الرئيسية'   },
      { href: 'distribution.html', icon: 'bar-chart-2',    label: 'المؤشرات'   },
      { href: 'findings.html',     icon: 'shield-alert',   label: 'الملاحظات'  },
      { href: 'forms.html',        icon: 'file-text',      label: 'النماذج'    },
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
    return parts[parts.length - 1] || 'index.html';
  }

  function buildBottomNav(items) {
    var nav = document.getElementById('bottom-nav');
    if (!nav) return;
    var page = currentPage();
    nav.innerHTML = items.map(function (item) {
      var active = (page === item.href) ? ' active' : '';
      return '<a href="' + item.href + '" class="nav-btn' + active + '">'
        + '<i data-lucide="' + item.icon + '"></i>'
        + '<span>' + item.label + '</span>'
        + '</a>';
    }).join('');
    nav.classList.remove('hidden');
  }

  function buildSideNav(items) {
    var nav = document.getElementById('side-nav');
    if (!nav) return;
    var page = currentPage();
    nav.innerHTML = items.map(function (item) {
      var isActive = (page === item.href);
      return '<a href="' + item.href + '" class="menu-item' + (isActive ? ' active' : '') + '">'
        + '<i data-lucide="' + item.icon + '" style="width:18px;height:18px;flex-shrink:0"></i>'
        + ' ' + item.label
        + '</a>';
    }).join('');
  }

  function _navInit() {
    try {
      var userStr = localStorage.getItem('iag_user');
      if (!userStr) return; // guest — leave nav empty
      var user  = JSON.parse(userStr);
      var items = getItems(user.role);

      // Populate user name in side menu header
      var menuUser = document.getElementById('menu-user');
      if (menuUser) menuUser.textContent = user.name || user.role || '—';
      var menuRole = document.getElementById('menu-role');
      if (menuRole) menuRole.textContent = user.role || '';

      buildBottomNav(items);
      buildSideNav(items);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
      // silent fail — don't break page
    }
  }

  // Run immediately if DOM is ready (nav.js is at bottom of body),
  // otherwise wait for DOMContentLoaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _navInit);
  } else {
    _navInit();
  }

})();
