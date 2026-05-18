//debug
console.log('Skrypt main.js został załadowany');

const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const messageContainer = document.querySelector('#message-container');

//debug
console.log('Formularz rejestracji znaleziony:', registerForm !== null);
console.log('Kontener wiadomości znaleziony:', messageContainer !== null);

function showMessage(text, type) {
    messageContainer.innerHTML = `<div class="alert alert-${type}">${text}</div>`;

}

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Zatrzymano domyślne przeładowanie strony');

    const username = document.querySelector('#register-username').value;
    const password = document.querySelector('#register-password').value;
    console.log('Pobrano dane z formularza:', username);

    try {
        console.log('Wysyłanie zapytania do serwera...');
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        console.log('Otrzymano odpowiedź o statusie:', response.status);

        const data = await response.json();
        console.log('Zdekodowano dane z serwera:', data);

        if(!response.ok) {
            showMessage(data.error, 'danger');
            return;
        }

        showMessage(data.message, 'success');
        registerForm.reset();
    } catch (error) {
        console.error('Wystąpił błąd w bloku try-catch:', error);
        showMessage('Błąd połączenia z serwerem', 'danger');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.querySelector('#login-username').value;
    const password = document.querySelector('#login-password').value;

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if(!response.ok) {
            showMessage(data.error, 'danger');
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        showMessage('Zalogowano pomyślnie', 'success');
        loginForm.reset();
    } catch (error) {
        showMessage('Błąd połączenia z serwerem', 'danger');
    }
});