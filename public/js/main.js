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

let currentDocId = null;

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
        
        dashboardSection.classList.add('d-none');
        editorSection.classList.remove('d-none');
        currentDocTitle.textContent = docTitle;
        
        markdownInput.value = '';
        htmlPreview.innerHTML = '';
    }
});

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const renderMarkdown = debounce(() => {
    const rawText = markdownInput.value;
    htmlPreview.innerHTML = window.marked.parse(rawText);
}, 300);

markdownInput.addEventListener('input', renderMarkdown);

backBtn.addEventListener('click', () => {
    editorSection.classList.add('d-none');
    dashboardSection.classList.remove('d-none');
    currentDocId = null;
});

checkAuth();