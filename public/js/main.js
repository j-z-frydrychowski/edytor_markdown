import { checkAuth } from './auth.js';

const messageContainer = document.querySelector('#message-container');
const dashboardSection = document.querySelector('#dashboard-section');
const documentsList = document.querySelector('#documents-list');
const createDocBtn = document.querySelector('#create-doc-btn');
const editorSection = document.querySelector('#editor-section');
const markdownInput = document.querySelector('#markdown-input');
const htmlPreview = document.querySelector('#html-preview');
const currentDocTitle = document.querySelector('#current-doc-title');
const backBtn = document.querySelector('#back-btn');
const activeUsers = new Map();
const activeUserContainer = document.querySelector('#active-user-container');

let currentDocId = null;
let ws = null;
let lastKnownContent = '';
let isRemoteUpdate = false;

function sendCursorPosition(){
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
            type: 'cursor',
            docId: currentDocId,
            username: localStorage.getItem('username'),
            position: markdownInput.selectionStart
        }));
    }
}

markdownInput.addEventListener('keyup', sendCursorPosition);
markdownInput.addEventListener('click', sendCursorPosition);

function getDiff(oldStr, newStr) {
    let i = 0;
    while (i < oldStr.length && i < newStr.length && oldStr[i] === newStr[i]) {
        i++;
    }
    let jOld = oldStr.length - 1;
    let jNew = newStr.length - 1;
    while (jOld >= 0 && jNew >= i && oldStr[jOld] === newStr[jNew]) {
        jOld--;
        jNew--;
    }
    return {
        offset: i,
        deleted: oldStr.substring(i, jOld + 1),
        inserted: newStr.substring(i, jNew + 1)
    };
}

function applyDiff(content, diff) {
    return content.substring(0, diff.offset) + diff.inserted + content.substring(diff.offset + diff.deleted.length);
}

export function showMessage(text, type) {
    messageContainer.innerHTML = `<div class="alert alert-${type}">${text}</div>`;
}

export async function loadDocuments() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/documents', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Brak autoryzacji');
        const docs = await response.json();
        renderDocuments(docs);
    } catch (error) {
        localStorage.removeItem('token');
        checkAuth();
    }
}

async function saveDocument(content) {
    if (!currentDocId) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/documents/${currentDocId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            console.error('Błąd serwera:', await response.text());
        } else {
            console.log('Dokument zapisany pomyślnie');
        }
    } catch (error) {
        console.error('Błąd podczas zapisywania dokumentu', error);
    }
}

// const readMarkdown = debounce(() => {
//     const rawText = markdownInput.value;
//     htmlPreview.innerHTML = window.marked.parse(rawText);
//     saveDocument(rawText);
// }, 300);

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
        if (response.ok) {
            loadDocuments();
        } else {
            const data = await response.json();
            showMessage(data.error, 'danger');
        }
    } catch (error) {
        showMessage('Błąd podczas tworzenia dokumentu', 'danger');
    }
});

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
            if (response.ok) loadDocuments();
            else {
                const data = await response.json();
                showMessage(data.error, 'danger');
            }
        } catch (error) {
            showMessage('Błąd usuwania', 'danger');
        }
    }

    if (event.target.classList.contains('open-doc-btn')) {
        currentDocId = event.target.getAttribute('data-id');
        const docTitle = event.target.closest('li').querySelector('span').textContent;
        const token = localStorage.getItem('token');
        
        dashboardSection.classList.add('d-none');
        editorSection.classList.remove('d-none');
        currentDocTitle.textContent = docTitle;
        
        if (ws) ws.close();
        ws = new WebSocket('ws://localhost:3000');
        
        ws.onopen = () => console.log('WebSocket połączony. Stan:', ws.readyState);
        ws.onerror = (err) => console.error('Błąd połączenia WebSocket:', err);
        ws.onclose = () => console.log('WebSocket rozłączony');
        
        ws.onmessage = (event) => {
            console.log('Odebrano surową wiadomość:', event.data);
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'edit' && data.docId === currentDocId) {
                    console.log('Stosowanie zmian. Stary tekst:', lastKnownContent);
                    isRemoteUpdate = true;
                    
                    const cursorStart = markdownInput.selectionStart;
                    const cursorEnd = markdownInput.selectionEnd;
                    
                    lastKnownContent = applyDiff(lastKnownContent, data.diff);
                    markdownInput.value = lastKnownContent;
                    htmlPreview.innerHTML = window.marked.parse(lastKnownContent);
                    
                    let offsetChange = 0;
                    if (cursorStart > data.diff.offset) {
                        offsetChange = data.diff.inserted.length - data.diff.deleted.length;
                    } 
                    markdownInput.setSelectionRange(cursorStart + offsetChange, cursorEnd + offsetChange);
                    
                    isRemoteUpdate = false;
                    console.log('Nowy tekst po zmianach:', lastKnownContent);
                } else if (data.type === 'cursor' && data.docId === currentDocId ) {
                    activeUsers.set(data.username, data.position);
                    renderActiveUsers();
                }
            } catch (error) {
                console.error('Błąd WebSocket:', error);
            }
        };

        markdownInput.value = 'Ładowanie pliku...';
        htmlPreview.innerHTML = '';

        try {
            const response = await fetch(`/api/documents/${currentDocId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const doc = await response.json();
                lastKnownContent = doc.content || '';
                markdownInput.value = doc.content || '';
                htmlPreview.innerHTML = window.marked.parse(doc.content || '');
            }
        } catch (error) {
            showMessage('Błąd podczas ładowania dokumentu', 'danger');
        }
    }
});

function renderActiveUsers() {
    if (!activeUserContainer) return;
    if (activeUserContainer.size === 0) {
        activeUserContainer.textContent = 'Brak innych użytkowników w dokumencie';
        return;
    }

    const usersList = [];
    activeUsers.forEach((position, username) => {
        usersList.push(username + ' (pozycja: ' + position + ')');
    });
    activeUserContainer.textContent = 'Aktywni użytkownicy: ' + usersList.join(', ');
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const renderMarkdown = debounce(() => {
    htmlPreview.innerHTML = window.marked.parse(lastKnownContent);
    saveDocument(lastKnownContent);
}, 300);

markdownInput.addEventListener('input', () => {
    if (isRemoteUpdate) return;
    
    const currentContent = markdownInput.value;
    const diff = getDiff(lastKnownContent, currentContent);
    lastKnownContent = currentContent;
    
    const hasChanges = diff.inserted.length > 0 || diff.deleted.length > 0;
    console.log('Próba wysłania. Różnica:', diff, 'Stan gniazda:', ws ? ws.readyState : 'brak');
    
    if (ws && ws.readyState === 1 && hasChanges) {
        const payload = JSON.stringify({
            type: 'edit',
            docId: currentDocId,
            diff: diff
        });
        console.log('Wysyłam ładunek:', payload);
        ws.send(payload);
    }
    
    renderMarkdown();
});

backBtn.addEventListener('click', () => {
    if (ws) ws.close();
    editorSection.classList.add('d-none');
    dashboardSection.classList.remove('d-none');
    currentDocId = null;

    activeUsers.clear();
    if (activeUserContainer) activeUserContainer.textContent = 'Brak innych użytkowników w dokumencie';
});

if (typeof checkAuth === 'function') checkAuth();