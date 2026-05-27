var socket;
var codigoSala;
var miSid;          
var jugadores = [];  

var EMOJI = { piedra: '✊', papel: '✋', tijera: '✌️' };

function el(id)  { return document.getElementById(id); }
function mostrar(id) { el(id).style.display = 'block'; }
function ocultar(id) { el(id).style.display = 'none'; }

function deshabilitarBotones(si) {
    document.querySelectorAll('.choice').forEach(function(b) { b.disabled = si; });
}

function yo()       { return jugadores.find(function(j) { return j.sid === miSid; }); }
function oponente() { return jugadores.find(function(j) { return j.sid !== miSid; }); }

function actualizarMarcador() {
    el('score1').textContent = yo().nombre      + ': ' + yo().puntos;
    el('score2').textContent = oponente().nombre + ': ' + oponente().puntos;
}

function reiniciarFighters() {
    el('fighter1').textContent = '✊';
    el('fighter2').textContent = '✊';
}

// ── Lobby ─────────────────────────────────────────────────────────────────
function mostrarOnline() {
    mostrar('onlineSection');
}

function conectar() {
    if (socket) return;
    socket = io();

    // Guardamos nuestro sid en cuanto nos conectamos
    socket.on('connect', function() {
        miSid = socket.id;
    });

    socket.on('sala_creada', function(datos) {
        codigoSala = datos.codigo;
        el('displayCodigo').textContent = datos.codigo;
        ocultar('onlineSection');
        mostrar('waitingSection');
    });

    socket.on('juego_iniciado', function(datos) {
        // Actualizamos miSid por si acaso llegó antes del 'connect'
        miSid = socket.id;
        jugadores = datos.jugadores.map(function(j) {
            return { sid: j.sid, nombre: j.nombre, puntos: 0 };
        });
        iniciarJuego();
    });

    socket.on('oponente_eligio', function() {
        el('turnText').textContent = oponente().nombre + ' ya eligió, elige tú también';
        el('fighter2').textContent = '❓';
    });

    socket.on('resultado_ronda', function(datos) {
        el('fighter1').textContent = EMOJI[datos.elecciones[yo().sid]];
        el('fighter2').textContent = EMOJI[datos.elecciones[oponente().sid]];

        yo().puntos       = datos.puntos[yo().sid];
        oponente().puntos = datos.puntos[oponente().sid];
        actualizarMarcador();

        if (datos.ganador === null) {
            el('result').textContent = ' ¡Empate!';
            el('result').style.color = '#ffd166';
        } else if (datos.ganador === miSid) {
            el('result').textContent = ' ¡Ganaste!';
            el('result').style.color = '#00ff99';
        } else {
            el('result').textContent = '¡Perdiste!';
            el('result').style.color = '#ff4d6d';
        }

        el('turnText').textContent =
            yo().nombre       + ' eligió ' + EMOJI[datos.elecciones[yo().sid]] + '  |  ' +
            oponente().nombre + ' eligió ' + EMOJI[datos.elecciones[oponente().sid]];

        deshabilitarBotones(true);
        setTimeout(function() {
            reiniciarFighters();
            deshabilitarBotones(false);
            el('result').textContent = '';
            el('turnText').textContent = 'Elige tu jugada 👇';
        }, 3000);
    });

    socket.on('jugador_salio', function(datos) {
        alert(datos.nombre + ' abandonó la partida.');
        location.reload();
    });

    socket.on('error', function(datos) {
        el('lobbyMsg').textContent = datos.msg;
        el('lobbyMsg').style.color = '#ff4d6d';
    });
}

function crearSala() {
    var nombre = el('nameInput').value.trim();
    if (!nombre) { alert('Ingresa tu nombre'); return; }
    conectar();
    socket.emit('crear_sala', { nombre: nombre });
}

function unirseASala() {
    var nombre = el('nameInput').value.trim();
    var codigo = el('roomInput').value.trim().toUpperCase();
    if (!nombre) { alert('Ingresa tu nombre'); return; }
    if (!codigo) { alert('Ingresa el código de sala'); return; }
    conectar();
    codigoSala = codigo;
    socket.emit('unirse_sala', { nombre: nombre, codigo: codigo });
}

// ── Juego ─────────────────────────────────────────────────────────────────
function iniciarJuego() {
    el('playersTitle').textContent = yo().nombre + ' VS ' + oponente().nombre;
    actualizarMarcador();
    reiniciarFighters();
    deshabilitarBotones(false);
    el('result').textContent = '';
    el('turnText').textContent = 'Elige tu jugada ';
    ocultar('onlineSection');
    ocultar('waitingSection');
    mostrar('gameSection');
}

function elegir(opcion) {
    deshabilitarBotones(true);
    el('turnText').textContent = 'Esperando al oponente…';
    el('fighter1').textContent = EMOJI[opcion];
    socket.emit('elegir', { codigo: codigoSala, opcion: opcion });
}

function copiarCodigo() {
    navigator.clipboard.writeText(el('displayCodigo').textContent);
    var btn = document.querySelector('.copy-btn');
    btn.textContent = ' ¡Copiado!';
    setTimeout(function() { btn.textContent = '📋 Copiar código'; }, 2000);
}

// ── Ranking ──────────────────────────────────────────────────────────────
function mostrarRankings() {
    cargarRankings();
    ocultar('onlineSection');
    ocultar('waitingSection');
    ocultar('gameSection');
    mostrar('rankingSection');
}

function ocultarRankings() {
    ocultar('rankingSection');
}

function cargarRankings() {
    fetch('/api/rankings')
        .then(response => response.json())
        .then(data => {
            var tbody = el('rankingBody');
            tbody.innerHTML = '';
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">No hay datos de ranking aún</td></tr>';
                return;
            }
            data.forEach(function(player, index) {
                var winRate = player.partidas > 0 ? ((player.victorias / player.partidas) * 100).toFixed(1) : '0';
                var row = document.createElement('tr');
                row.innerHTML = '<td>' + (index + 1) + '</td>' +
                                '<td>' + player.nombre + '</td>' +
                                '<td>' + player.victorias + '</td>' +
                                '<td>' + player.partidas + '</td>' +
                                '<td>' + winRate + '%</td>';
                tbody.appendChild(row);
            });
        })
        .catch(err => console.error('Error cargando ranking:', err));
}
