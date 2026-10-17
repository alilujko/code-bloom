// Реєстрація та вхід через API (server/main.py, MongoDB).
(function () {
    var form = document.querySelector('form');
    var btn = form && form.querySelector('.register_button');
    if (!form || !btn) return;

    var isRegister = !!document.getElementById('nickname');
    var errorBox = document.createElement('p');
    errorBox.className = 'form_error';
    errorBox.setAttribute('role', 'alert');
    btn.parentNode.insertBefore(errorBox, btn);

    function showError(text) { errorBox.textContent = text; }

    async function submit() {
        showError('');
        var password = document.getElementById('password').value;
        var url, body;

        if (isRegister) {
            var nick = document.getElementById('nickname').value.trim();
            var email = document.getElementById('email').value.trim();
            if (!nick || !email || !password) return showError('Заповни всі поля');
            url = '/sign_up';
            body = { login: nick, email: email, password: password };
        } else {
            var login = document.getElementById('login').value.trim();
            if (!login || !password) return showError('Заповни всі поля');
            url = '/sign_in';
            body = { login: login, password: password };
        }

        var label = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Зачекай...';
        try {
            var data = await CB.api('POST', url, body);
            try {
                localStorage.setItem('auth_token', data.token);
            } catch (e) {}
            CB.remember(data);
            location.href = data.is_admin ? 'admin.html' : 'index.html';
        } catch (e) {
            showError(e.message || 'Перевір введені дані');
        } finally {
            btn.disabled = false;
            btn.textContent = label;
        }
    }

    btn.addEventListener('click', submit);
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
})();
