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
const activeUsersContainer = document.querySelector('#active-users-container');
const connectionStatus = document.querySelector('#connection-status');
const exportMdBtn = document.querySelector('#export-md-button');
const exportHtmlBtn = document.querySelector('#export-html-button');

let currentDocId = null;
let ws = null;
let lastKnownContent = '';
let isRemoteUpdate = false;
let lastDocsSnapshot = '';

function saveOfflineEdit(diff) {
    if(!currentDocId) return;
    const key = 'offlineEdits_' + currentDocId;
    const queue = JSON.parse(localStorage.getItem(key) || '[]');
    queue.push(diff);
    localStorage.setItem(key, JSON.stringify(queue));
}

function syncOfflineEdits() { 
    if(!currentDocId || !ws || ws.readyState !== 1) return;
    const key = 'offlineEdits_' + currentDocId;
    const queue = JSON.parse(localStorage.getItem(key) || '[]');
    if(queue.length === 0) return;

    queue.forEach(diff => {
        ws.send(JSON.stringify({
            type: 'edit',
            docId: currentDocId,
            diff: diff
        }));
    });
    localStorage.removeItem(key);

    saveDocument(lastKnownContent);
}

function sendCursorPosition() {
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
            type: 'cursor',
            docId: currentDocId,
            username: localStorage.getItem('username'),
            position: markdownInput.selectionStart
        }));
    }
}

function sendLeaveMessage() {
    if (ws && ws.readyState === 1 && currentDocId) {
        ws.send(JSON.stringify({
            type: 'leave',
            docId: currentDocId,
            username: localStorage.getItem('username')
        }));
    }
}

window.addEventListener('beforeunload', sendLeaveMessage);

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

function connectWebSocket() {
    if (!currentDocId) return;
    
    if (ws) {
        ws.onclose = null;
        ws.close();
    }

    ws = new WebSocket('ws://localhost:3000');
    
    ws.onopen = () => {
        if (connectionStatus) {
            connectionStatus.textContent = 'Status: Online';
            connectionStatus.className = 'mb-3 text-success fw-bold';
        }
        syncOfflineEdits();
        sendCursorPosition();
    };

    ws.onclose = () => {
        if (connectionStatus) {
            connectionStatus.textContent = 'Status: Offline';
            connectionStatus.className = 'mb-3 text-danger fw-bold';
        }

        if (currentDocId) {
            setTimeout(connectWebSocket, 3000);
        }
    };

    ws.onerror = (err) => {
        console.error('Błąd połączenia WebSocket', err);
    }

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'edit' && data.docId === currentDocId) {
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
            } else if (data.type === 'cursor' && data.docId === currentDocId) {
                const isNewUser = !activeUsers.has(data.username);
                activeUsers.set(data.username, data.position);
                renderActiveUsers();

                if (isNewUser) sendCursorPosition();
            } else if (data.type === 'leave' && data.docId === currentDocId) {
                activeUsers.delete(data.username);
                renderActiveUsers();
            }
        } catch (error) {
        console.error('Błąd WebSocket', error);
        }
    };
}

export async function loadDocuments() {
    const token = localStorage.getItem('token');
    if(!token) return;

    try {
        const response = await fetch('/api/documents', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if(response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                checkAuth();
                return
            }
            throw new Error('Błąd ładowania dokumentów');
        }

        const docs = await response.json();
        const currentSnapshot = JSON.stringify(docs);

        if (currentSnapshot !== lastDocsSnapshot) { 
            lastDocsSnapshot = currentSnapshot;
            renderDocuments(docs);
        } 
    } catch (error) {
        console.error(error);
        showMessage('Błąd ładowania dokumentów', 'danger');
    }
}

async function saveDocument(content) {
    if (!currentDocId || !ws || ws.readyState !== 1) return;
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

    const currentUsername = localStorage.getItem('username');

    docs.forEach(doc => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';

        const isOwner = doc.ownerUsername === currentUsername;

        let buttonsHtml = `<button class="btn btn-sm btn-success open-doc-btn" data-id="${doc.id}">Otwórz</button>`;

        if (isOwner) {
            buttonsHtml += `
                <button class="btn btn-sm btn-primary share-doc-btn ms-1" data-id="${doc.id}">Udostępnij</button>
                <button class="btn btn-sm btn-danger delete-doc-btn ms-1" data-id="${doc.id}">Usuń</button>
            `;
        } else {
            li.classList.add('bg-light');
            buttonsHtml += `<span class="badge bg-info text-dark ms-2">Od: ${doc.ownerUsername}</span>`;
        }
        li.innerHTML = `
            <span>${doc.title}</span>
            <div>
                ${buttonsHtml}
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
        
        connectWebSocket();

        markdownInput.value = 'Ładowanie pliku...';
        htmlPreview.innerHTML = '';
        
        try {
            const response = await fetch(`/api/documents/${currentDocId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const doc = await response.json();
                lastKnownContent = doc.content || '';
                markdownInput.value = lastKnownContent;
                htmlPreview.innerHTML = window.marked.parse(lastKnownContent);
            }
        } catch (error) {
            showMessage('Błąd podczas ładowania dokumentu', 'danger');
        }
    }

    if (event.target.classList.contains('share-doc-btn')) {
        const docId = event.target.getAttribute('data-id');
        const token = localStorage.getItem('token');
        let usernameToShare = prompt('Podaj nazwę użytkownika, z którym chcesz udostępnić dokument:');
        
        if (!usernameToShare) return;
        
        usernameToShare = usernameToShare.trim();

        try {
            const response = await fetch(`/api/documents/${docId}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username: usernameToShare })
            });

            const data = await response.json();
            if (response.ok) {
                showMessage(data.message, 'success');
            } else {
                showMessage(data.error, 'danger');
            }
        } catch (error) {
            showMessage('Błąd udstępniania', 'danger');
        }
    }
});

function renderActiveUsers() {
    if (!activeUsersContainer) return;
    if (activeUsers.size === 0) {
        activeUsersContainer.textContent = 'Brak innych użytkowników w dokumencie.';
        return;
    }

    const usersList = [];
    activeUsers.forEach((position, username) => {
        usersList.push(username + ' (pozycja: ' + position + ')');
    });
    activeUsersContainer.textContent = 'Aktywni użytkownicy: ' + usersList.join(', ');
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
    
    if (hasChanges) {
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({
                type: 'edit',
                docId: currentDocId,
                diff: diff
            }));
            sendCursorPosition();
        } else {
            saveOfflineEdit(diff);
        }
    }
    
    renderMarkdown();
});

backBtn.addEventListener('click', () => {
    sendLeaveMessage();
    currentDocId = null;
    if (ws) ws.close();
    editorSection.classList.add('d-none');
    dashboardSection.classList.remove('d-none');

    activeUsers.clear();
    if (activeUsersContainer) activeUsersContainer.textContent = 'Brak innych użytkowników w dokumencie';
});

if (typeof checkAuth === 'function') checkAuth();

function donwloadFile(filename, content, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

if (exportMdBtn) {
    exportMdBtn.addEventListener('click', () => {
        if (!currentDocId) return;
        const title = currentDocTitle.textContent || 'dokument';
        donwloadFile(title + '.md', lastKnownContent, 'text/markdown');
    });
}

if (exportHtmlBtn) {
    exportHtmlBtn.addEventListener('click', () => {
        if (!currentDocId) return;
        const title = currentDocTitle.textContent || 'dokument';
        const htmlContent = '<!DOCTYPE html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n<title>' + title + '</title>\n</head>\n<body>\n' + htmlPreview.innerHTML + '\n</body>\n</html>';
        donwloadFile(title + '.html', htmlContent, 'text/html');
    });
}

setInterval(() => {
    if (dashboardSection.classList.contains('d-none')) loadDocuments();
}, 5000);