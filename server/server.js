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

async function getUsers() {
    try {
        const data = await fs.readFile(userFile, 'utf-8');
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

//Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});