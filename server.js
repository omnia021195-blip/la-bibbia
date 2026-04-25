const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

// Aumento il limite per permettere l'invio di foto ad alta risoluzione da sbloccare
app.use(express.json({limit: '25mb'}));
app.use(express.static('public'));

let segreti = [];

// Carica il database dei peccati all'avvio
if (fs.existsSync('segreti.json')) {
    try {
        segreti = JSON.parse(fs.readFileSync('segreti.json'));
    } catch (e) {
        segreti = [];
    }
}

function salva() {
    fs.writeFileSync('segreti.json', JSON.stringify(segreti, null, 2));
}

io.on('connection', (socket) => {
    // Invia i segreti esistenti al nuovo arrivato
    socket.emit('carica_storico', segreti);

    // Quando un utente invia un sussurro o una foto
    socket.on('nuovo_segreto', (data) => {
        const nuovo = {
            id: Date.now(),
            testo: data.testo,
            foto: data.foto || null,
            likes: Math.floor(Math.random() * 7), // Un po' di hype iniziale automatico
            blur: true, // Nasce sempre sfocato per la massa
            targetLikes: 50 // Quanti "brucia" servono per svelare il peccato
        };
        segreti.unshift(nuovo);
        salva();
        io.emit('pubblica_segreto', nuovo);
    });

    // La massa vota per sbloccare
    socket.on('add_like', (id) => {
        const s = segreti.find(s => s.id === id);
        if (s) {
            s.likes += 1;
            // Se raggiunge il target, la foto si sblocca per tutti
            if (s.likes >= s.targetLikes) s.blur = false;
            salva();
            io.emit('update_segreto', s);
        }
    });

    // --- POTERI DELL'ENIGMISTA ---
    
    // Iniezione massiva di like (Hype istantaneo)
    socket.on('admin_pump', (id) => {
        const s = segreti.find(s => s.id === id);
        if (s) {
            s.likes += 50; 
            if (s.likes >= s.targetLikes) s.blur = false;
            salva();
            io.emit('update_segreto', s);
        }
    });

    // Eliminazione totale
    socket.on('admin_elimina', (id) => {
        segreti = segreti.filter(s => s.id !== id);
        salva();
        io.emit('carica_storico', segreti);
    });

    // Sblocco/Blocco manuale
    socket.on('admin_unblur', (id) => {
        const s = segreti.find(s => s.id === id);
        if (s) s.blur = !s.blur;
        salva();
        io.emit('update_segreto', s);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => { 
    console.log('--- LA BIBBIA V2: SISTEMA OMNIA ATTIVO ---'); 
});
