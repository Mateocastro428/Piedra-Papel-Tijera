from flask import Flask, render_template
from gevent import monkey
monkey.patch_all()
from flask_socketio import SocketIO

app = Flask(__name__)
app.config['SECRET_KEY'] = 'clave-secreta'
socketio = SocketIO(app, async_mode='gevent')

from game_logic import register_handlers
register_handlers(socketio)

@app.route('/')
def inicio():
    return render_template('index.html')

if __name__ == '__main__':
    socketio.run(app, debug=True)
