// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDSYZU7csuyTcQJQHnbpMnsnpnwIVjuIj0",
    authDomain: "messagerie-pwa.firebaseapp.com",
    projectId: "messagerie-pwa",
    storageBucket: "messagerie-pwa.firebasestorage.app",
    messagingSenderId: "472747155329",
    appId: "1:472747155329:web:125a2521e79a93390ed280",
    databaseURL: "https://messagerie-pwa-default-rtdb.firebaseio.com/" // Assure-toi que cette URL correspond à celle de ta Realtime Database
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);
const realDB = firebase.database();
const messagesRef = realDB.ref('messages');

// Un identifiant unique pour cette session pour distinguer nos messages de ceux des autres
const currentUserId = 'user_' + Math.random().toString(36).substring(2, 9);

// Éléments du DOM
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const statusIndicator = document.getElementById('status-indicator');
const clearBtn = document.getElementById('clear-btn');

let db;

// 1. Initialisation IndexedDB (Sauvegarde locale hors ligne)
const request = indexedDB.open('MessagerieDB', 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    chargerMessagesLocaux();
};

// Formater l'heure (ex: 14:32)
function obtenirHeureFormatee(dateObj) {
    const d = dateObj ? new Date(dateObj) : new Date();
    const heures = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${heures}:${minutes}`;
}

// 2. Afficher un message sur l'écran
function afficherMessage(texte, type, dateStr) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', type);

    const texteSpan = document.createElement('span');
    texteSpan.textContent = texte;
    msgDiv.appendChild(texteSpan);

    if (type !== 'system') {
        const timeSpan = document.createElement('span');
        timeSpan.classList.add('time');
        timeSpan.textContent = obtenirHeureFormatee(dateStr);
        msgDiv.appendChild(timeSpan);
    }

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 3. Sauvegarder dans IndexedDB
function sauvegarderMessageLocal(texte, type, dateStr) {
    if (!db) return;
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    store.add({ texte: texte, type: type, date: dateStr });
}

// 4. Charger l'historique local quand on est hors ligne
function chargerMessagesLocaux() {
    if (!navigator.onLine && db) {
        const transaction = db.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const req = store.getAll();

        req.onsuccess = () => {
            req.result.forEach(msg => {
                afficherMessage(msg.texte, msg.type, msg.date);
            });
        };
    }
}

// 5. Écoute des messages Firebase en temps réel
messagesRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    const type = (data.senderId === currentUserId) ? 'sent' : 'received';
    
    afficherMessage(data.texte, type, data.date);
    sauvegarderMessageLocal(data.texte, type, data.date);
});

// 6. Envoyer un message vers Firebase
function envoyerMessage() {
    const texte = messageInput.value.trim();
    if (texte === '') return;

    const nouveauMessage = {
        texte: texte,
        senderId: currentUserId,
        date: new Date().toISOString()
    };

    if (navigator.onLine) {
        messagesRef.push(nouveauMessage);
    } else {
        afficherMessage(texte, 'sent', new Date());
        sauvegarderMessageLocal(texte, 'sent', new Date().toISOString());
    }

    messageInput.value = '';
}

sendBtn.addEventListener('click', envoyerMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') envoyerMessage();
});

// 7. Vider la discussion
clearBtn.addEventListener('click', () => {
    if (confirm("Voulez-vous vraiment effacer tous les messages ?")) {
        messagesRef.remove();
        if (db) {
            const transaction = db.transaction(['messages'], 'readwrite');
            transaction.objectStore('messages').clear();
        }
        chatBox.innerHTML = '<div class="message system">Discussion réinitialisée.</div>';
    }
});

// 8. Détection du statut réseau
function mettreAJourStatut() {
    if (navigator.onLine) {
        statusIndicator.textContent = "En ligne";
        statusIndicator.className = "status online";
    } else {
        statusIndicator.textContent = "Hors ligne";
        statusIndicator.className = "status offline";
    }
}

window.addEventListener('online', mettreAJourStatut);
window.addEventListener('offline', mettreAJourStatut);
mettreAJourStatut();

// 9. Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker OK'))
        .catch((err) => console.error('Erreur SW :', err));
}
