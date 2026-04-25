const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

app.use(express.json({limit: '25mb'})); // Aumentato per foto pesanti
app.use(express.static('public'));

let segreti = [];
if (fs.existsSync('segreti.json')) {
    segreti = JSON.parse(fs.readFileSync('segreti.json'));
}

function salva() {
    fs.writeFileSync('segreti.json', JSON.stringify(segreti, null, 2));
}

io.on('connection', (socket) => {
    socket.emit('carica_storico', segreti);

    socket.on('nuovo_segreto', (data) => {
        const nuovo = {
            id: Date.now(),
            testo: data.testo,
            foto: data.foto || null,
            likes: Math.floor(Math.random() * 12), // Partenza casuale per realismo
            blur: true,
            targetLikes: 50 // Quanti "brucia" servono per sbloccare
        };
        segreti.unshift(nuovo);
        salva();
        io.emit('pubblica_segreto', nuovo);
    });

    // SISTEMA BRUCIA (L'arma della massa)
    socket.on('add_like', (id) => {
        const s = segreti.find(s => s.id === id);
        if (s) {
            s.likes += 1;
            if (s.likes >= s.targetLikes) s.blur = false;
            salva();
            io.emit('update_segreto', s);
        }
    });

    // POTERE ADMIN: INIEZIONE MASSIVA
    socket.on('admin_pump', (id) => {
        const s = segreti.find(s => s.id === id);
        if (s) {
            s.likes += 50; 
            if (s.likes >= s.targetLikes) s.blur = false;
            salva();
            io.emit('update_segreto', s);
        }
    });

    socket.on('admin_elimina', (id) => {
        segreti = segreti.filter(s => s.id !== id);
        salva();
        io.emit('carica_storico', segreti);
    });

    socket.on('admin_unblur', (id) => {
        const s = segreti.find(s => s.id === id);
        if (s) s.blur = !s.blur;
        salva();
        io.emit('carica_storico', segreti);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => { console.log('SISTEMA OMNIA ATTIVO SULLA PORTA ' + PORT); });
