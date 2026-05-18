//debug
//console.log('Skrypt main.js został załadowany');

const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const messageContainer = document.querySelector('#message-container');

const dashboardSection = document.querySelector('#dashboard-section');
const authSection = document.querySelector('#auth-section');
const documentsList = document.querySelector('#documents-list');
const createDocBtn = document.querySelector('#create-doc-btn');
const logoutBtn = document.querySelector('#logout-btn');

//debug
// console.log('Formularz rejestracji znaleziony:', registerForm !== null);
// console.log('Kontener wiadomości znaleziony:', messageContainer !== null);

function showMessage(text, type) {
    messageContainer.innerHTML = `<div class="alert alert-${type}">${text}</div>`;

}

function checkAuth() {
    const token = localStorage.getItem('token');
    
    if(token) {
        authSection.classList.add('d-none');
        dashboardSection.classList.remove('d-none');
        messageContainer.innerHTML = '';
        loadDocuments();
    } else {
        authSection.classList.remove('d-none');
        dashboardSection.classList.add('d-none');
    }
}

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    checkAuth();
});

async function loadDocuments() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/documents', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Brak autoryzacji');
        
        const docs = await response.json();
        console.log('Pobrane dokumenty z serwera:', docs);
        renderDocuments(docs);
    } catch (error) {
        console.error('Błąd pobierania:', error);
        localStorage.removeItem('token');
        checkAuth();
    }
}

// Dynamiczne renderowanie listy dokumentów
function renderDocuments(docs) {
    documentsList.innerHTML = '';
    if (docs.length === 0) {
        documentsList.innerHTML = '<li class="list-group-item text-muted">Brak dokumentów. Utwórz nowy dokument.</li>';
        return;
    }
    
    docs.forEach(doc => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            <span>${doc.title}</span>
            <div>
                <button class="btn btn-sm btn-success open-doc-btn" data-id="${doc.id}">Otwórz</button>
                <button class="btn btn-sm btn-danger delete-doc-btn" data-id="${doc.id}">Usuń</button>
            </div>
        `;
        documentsList.appendChild(li);
    });
}

//Rejestracja
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    //console.log('Zatrzymano domyślne przeładowanie strony');

    const username = document.querySelector('#register-username').value;
    const password = document.querySelector('#register-password').value;
    //console.log('Pobrano dane z formularza:', username);

    try {
        //console.log('Wysyłanie zapytania do serwera...');
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        //console.log('Otrzymano odpowiedź o statusie:', response.status);

        const data = await response.json();
        //console.log('Zdekodowano dane z serwera:', data);

        if(!response.ok) {
            showMessage(data.error, 'danger');
            return;
        }

        showMessage(data.message, 'success');
        registerForm.reset();
    } catch (error) {
        //console.error('Wystąpił błąd w bloku try-catch:', error);
        showMessage('Błąd połączenia z serwerem', 'danger');
    }
});

//Logowanie
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
        checkAuth();
    } catch (error) {
        showMessage('Błąd połączenia z serwerem', 'danger');
    }
});

// Tworzenie nowego dokumentu
createDocBtn.addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    const title = prompt('Podaj tytuł dokumentu:');
    if (!title) return;

    try {
        const response = await fetch('/api/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title })
        });

        if(response.ok) {
            loadDocuments();
        } else {
            const data = await response.json();
            showMessage(data.error, 'danger');
        }
    } catch (error) {
        showMessage('Błąd podczas tworzenia dokumentu', 'danger');
    }
});

// Obsługa przycisku usuń
documentsList.addEventListener('click', async (event) => {
    if (event.target.classList.contains('delete-doc-btn')) {
        const docId = event.target.getAttribute('data-id');
        const token = localStorage.getItem('token');
        
        if (!confirm('Czy na pewno chcesz usunąć ten dokument?')) return;

        try {
            const response = await fetch(`/api/documents/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                loadDocuments();
            } else {
                const data = await response.json();
                showMessage(data.error, 'danger');
            }
        } catch (error) {
            showMessage('Błąd usuwania', 'danger');
        }
    }
});

// Uruchomienie sprawdzenia stanu na starcie aplikacji
checkAuth();