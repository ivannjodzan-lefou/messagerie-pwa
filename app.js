// Éléments du DOM
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const statusIndicator = document.getElementById('status-indicator');
const clearBtn = document.getElementById('clear-btn');

let db;

// 1. Initialisation IndexedDB
const request = indexedDB.open('MessagerieDB', 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    chargerMessages();
};

request.onerror = (e) => {
    console.error("Erreur IndexedDB :", e.target.errorCode);
};

// Formater l'heure (ex: 14:32)
function obtenirHeureFormatee(dateObj) {
    const d = dateObj ? new Date(dateObj) : new Date();
    const heures = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${heures}:${minutes}`;
}

// 2. Afficher un message avec son heure
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
function sauvegarderMessage(texte, type) {
    const maintentant = new Date();
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    const message = { texte: texte, type: type, date: maintentant };
    store.add(message);
    return maintentant;
}

// 4. Charger l'historique
function chargerMessages() {
    const transaction = db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const request = store.getAll();

    request.onsuccess = () => {
        request.result.forEach(msg => {
            afficherMessage(msg.texte, msg.type, msg.date);
        });
    };
}

// 5. Envoyer un message
function envoyerMessage() {
    const texte = messageInput.value.trim();
    if (texte === '') return;

    const dateCreation = sauvegarderMessage(texte, 'sent');
    afficherMessage(texte, 'sent', dateCreation);
    messageInput.value = '';
}

sendBtn.addEventListener('click', envoyerMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') envoyerMessage();
});

// 6. Vider la discussion
clearBtn.addEventListener('click', () => {
    if (confirm("Voulez-vous vraiment effacer tous les messages ?")) {
        const transaction = db.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');
        store.clear().onsuccess = () => {
            chatBox.innerHTML = '<div class="message system">Discussion réinitialisée.</div>';
        };
    }
});

// 7. Statut Connexion
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

// 8. Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker OK'))
    .catch((err) => console.error('Erreur SW :', err));
}
