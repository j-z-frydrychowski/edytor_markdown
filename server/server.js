import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = 3000;
const SECRET_KEY = 'supertajnykluczhehe'

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const userFile = path.resolve('data', 'users.json');
const docsFile = path.resolve('data', 'documents.json');

async function getUsers() {
    try {
        const data = await fs.readFile(userFile, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    
    }
}

async function getDocuments() {
    try {
        const data = await fs.readFile(docsFile, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

//Endpoint: Rejestracja
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = await getUsers();

        if(users.find(u => u.username === username)) {
            return res.status(400).json({error: 'Użytkownik już istnieje'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: Date.now(), username, password: hashedPassword}

        users.push(newUser);
        await fs.writeFile(userFile, JSON.stringify(users, null, 2));

        res.status(201).json({message: 'Rejestracja zakończona pomyślnie'});
    } catch (error) {
        res.status(500).json({error: 'Błąd serwera podczas rejestracji'});
    }
});

//Endpoint: Logowanie
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = await getUsers();
        const user = users.find(u => u.username === username);

        if(!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({error: 'Nieprawidłowe dane logowania'});
        }

        const token = jwt.sign({ id: user.id, username: user.username}, SECRET_KEY, { expiresIn: '1h'});
        res.json({ token, username: user.username });
    } catch (error) {
        res.status(500).json({error: 'Błąd serwera podczas logowania'});
    }
});

// Weryfikacja tokenu
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({error: 'Brak tokenu'});

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({error: 'Nieprawidłowy token'});
        req.user = user;
        next();
    });
};

//Pobranie dokumentów użytkownika
app.get('/api/documents', authenticateToken, async (req, res) => {
    const docs = await getDocuments();
    const userDocs = docs.filter(doc => doc.ownerId === req.user.id);
    res.json(userDocs);
});

//Utworzenie dokumentu
app.post('/api/documents', authenticateToken, async (req, res) => {
    try {
        const { title } = req.body;
        const docs = await getDocuments();
        const newDoc = { 
            id: Date.now().toString(),
            title: title || 'Nowy dokument',
            content: '',
            ownerId: req.user.id,
            ownerUsername: req.user.username,
            createdAt: new Date().toISOString()
        };
        docs.push(newDoc);
        await fs.writeFile(docsFile, JSON.stringify(docs, null, 2));
        res.status(201).json(newDoc);
    } catch (error) {
        res.status(500).json({error: 'Błąd podczas tworzenia dokumentu'});
    }
});

//Usuwanie dokumentu
app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
    try {
        let docs = await getDocuments();
        const docIndex = docs.findIndex(d => d.id === req.params.id);

        if (docIndex === -1) return res.status(404).json({error: 'Dokument nie znaleziony'});
        
        if (docs[docIndex].ownerId !== req.user.id) return res.status(403).json({error: 'Brak uprawnień do usuwania dokumentu'});
        
        docs.splice(docIndex, 1);
        await fs.writeFile(docsFile, JSON.stringify(docs, null, 2));
        res.json({message: 'Dokument został usunięty'});
    } catch (error) {
        res.status(500).json({error: 'Błąd podczas usuwania dokumentu'});
    }
});

//Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});