const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

app.use(express.json({limit: '15mb'}));
app.use(express.static('public'));

let segreti = [];

// Carica i segreti salvati all'avvio
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
            likes: Math.floor(Math.random() * 5),
            blur: true
        };
        segreti.unshift(nuovo);
        salva();
        io.emit('pubblica_segreto', nuovo);
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

http.listen(3000, () => { console.log('L\'APOCALISSE È SALVATA SU DISCO.'); });