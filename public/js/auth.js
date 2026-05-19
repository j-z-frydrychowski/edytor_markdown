import { showMessage, loadDocuments } from './main.js';

const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const authSection = document.querySelector('#auth-section');
const dashboardSection = document.querySelector('#dashboard-section');
const logoutBtn = document.querySelector('#logout-btn');
const editorSection = document.querySelector('#editor-section');
const messageContainer = document.querySelector('#message-container');

export function checkAuth() {
    const token = localStorage.getItem('token');

    if (token) {
        authSection.classList.add('d-none');
        dashboardSection.classList.remove('d-none');
        messageContainer.innerHTML = '';
        loadDocuments();
    } else {
        authSection.classList.remove('d-none');
        dashboardSection.classList.add('d-none');
        editorSection.classList.add('d-none');
    }
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        checkAuth();
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.querySelector('#register-username').value;
        const password = document.querySelector('#register-password').value;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) {
                showMessage(data.error, 'danger');
                return;
            }
            showMessage(data.message, 'success');
            registerForm.reset();
        } catch (error) {
            showMessage('Błąd połączenia z serwerem', 'danger');
        }
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.querySelector('#login-username').value;
        const password = document.querySelector('#login-password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) {
                showMessage(data.error, 'danger');
                return;
            }
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            showMessage('Zalogowano pomyślnie', 'success');
            loginForm.reset();
            checkAuth();
        } catch (error) {
            showMessage('Błąd połączenia z serwerem', 'danger');
        }
    });
}