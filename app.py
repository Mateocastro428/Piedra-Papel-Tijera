from flask import Flask, render_template, jsonify
from gevent import monkey
monkey.patch_all()
from flask_socketio import SocketIO
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'clave-secreta'
socketio = SocketIO(app, async_mode='gevent')

from game_logic import register_handlers
from rankings import obtener_ranking
register_handlers(socketio)

@app.route('/')
def inicio():
    return render_template('index.html')

@app.route('/api/rankings')
def get_rankings():
    """Devuelve el top 10 de jugadores por victorias."""
    return jsonify(obtener_ranking())

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
