from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room
import random, string

app = Flask(__name__)
app.config['SECRET_KEY'] = 'clave-secreta'
socketio = SocketIO(app, cors_allowed_origins="*")

salas = {}  # { codigo: { jugadores: [{sid, nombre}], elecciones: {sid: opcion}, puntos: {sid: n} } }

def crear_codigo():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@app.route('/')
def inicio():
    return render_template('index.html')

@socketio.on('crear_sala')
def al_crear_sala(datos):
    codigo = crear_codigo()
    salas[codigo] = {
        'jugadores': [{'sid': request.sid, 'nombre': datos['nombre']}],
        'elecciones': {},
        'puntos': {request.sid: 0}
    }
    join_room(codigo)
    emit('sala_creada', {'codigo': codigo})

@socketio.on('unirse_sala')
def al_unirse(datos):
    codigo = datos['codigo'].upper().strip()
    if codigo not in salas:
        emit('error', {'msg': 'Sala no encontrada'})
        return
    sala = salas[codigo]
    if len(sala['jugadores']) >= 2:
        emit('error', {'msg': 'La sala está llena'})
        return

    sala['jugadores'].append({'sid': request.sid, 'nombre': datos['nombre']})
    sala['puntos'][request.sid] = 0
    join_room(codigo)

    j1 = sala['jugadores'][0]
    j2 = sala['jugadores'][1]
    socketio.emit('juego_iniciado', {
        'jugadores': [{'sid': j1['sid'], 'nombre': j1['nombre']},
                      {'sid': j2['sid'], 'nombre': j2['nombre']}]
    }, to=codigo)

@socketio.on('elegir')
def al_elegir(datos):
    codigo  = datos['codigo']
    opcion  = datos['opcion']
    sala    = salas.get(codigo)
    if not sala:
        return

    sala['elecciones'][request.sid] = opcion

    # Avisar al oponente que ya eligió (sin revelar qué)
    for j in sala['jugadores']:
        if j['sid'] != request.sid:
            socketio.emit('oponente_eligio', {}, to=j['sid'])

    if len(sala['elecciones']) == 2:
        resolver_ronda(codigo)

def resolver_ronda(codigo):
    sala = salas[codigo]
    j1, j2 = sala['jugadores']
    e1 = sala['elecciones'][j1['sid']]
    e2 = sala['elecciones'][j2['sid']]

    gana_a = {'piedra': 'tijera', 'papel': 'piedra', 'tijera': 'papel'}

    if e1 == e2:
        ganador = None
    elif gana_a[e1] == e2:
        ganador = j1['sid']
        sala['puntos'][j1['sid']] += 1
    else:
        ganador = j2['sid']
        sala['puntos'][j2['sid']] += 1

    socketio.emit('resultado_ronda', {
        'elecciones': {j1['sid']: e1, j2['sid']: e2},
        'ganador': ganador,
        'puntos': {j1['sid']: sala['puntos'][j1['sid']],
                   j2['sid']: sala['puntos'][j2['sid']]}
    }, to=codigo)

    sala['elecciones'] = {}

@socketio.on('disconnect')
def al_desconectar():
    for codigo, sala in list(salas.items()):
        for j in sala['jugadores']:
            if j['sid'] == request.sid:
                socketio.emit('jugador_salio', {'nombre': j['nombre']}, to=codigo)
                del salas[codigo]
                return

if __name__ == '__main__':
    socketio.run(app, debug=True)
