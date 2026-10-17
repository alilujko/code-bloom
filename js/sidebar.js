// Кнопка, яка згортає й розгортає бокову панель. Стан запам'ятовується.
(function () {
    var KEY = 'sidebar-collapsed';
    var root = document.documentElement;

    function stored() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
    function save(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }

    if (stored()) root.classList.add('sidebar-collapsed');

    document.addEventListener('DOMContentLoaded', function () {
        if (!document.querySelector('.header')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sidebar_toggle';
        btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>';
        function sync() {
            var c = root.classList.contains('sidebar-collapsed');
            btn.setAttribute('aria-label', c ? 'Показати панель' : 'Сховати панель');
            btn.title = btn.getAttribute('aria-label');
            btn.setAttribute('aria-expanded', String(!c));
        }
        btn.addEventListener('click', function () {
            var c = root.classList.toggle('sidebar-collapsed');
            save(c);
            sync();
        });
        document.body.appendChild(btn);
        sync();

        // Телефон і планшет: кнопка «меню» відкриває навігацію під шапкою
        var header = document.querySelector('.header');
        var menu = document.createElement('button');
        menu.type = 'button';
        menu.className = 'menu_toggle';
        menu.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="m1" d="M4 7h16"/><path class="m2" d="M4 12h16"/><path class="m3" d="M4 17h16"/></svg>';
        function setOpen(open) {
            root.classList.toggle('nav-open', open);
            menu.setAttribute('aria-expanded', String(open));
            menu.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
        }
        menu.addEventListener('click', function () { setOpen(!root.classList.contains('nav-open')); });
        header.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
        window.addEventListener('resize', function () { if (window.innerWidth > 900) setOpen(false); });
        header.querySelector('.left_part').appendChild(menu);
        setOpen(false);
    });
})();
