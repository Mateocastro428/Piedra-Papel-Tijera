import json
import os

RANKINGS_FILE = 'rankings.json'

def cargar_rankings():

    if os.path.exists(RANKINGS_FILE):
        try:
            with open(RANKINGS_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def guardar_rankings(rankings):
    """Guarda los rankings en el archivo JSON."""
    with open(RANKINGS_FILE, 'w') as f:
        json.dump(rankings, f, indent=2)

def obtener_ranking():
    
    rankings = cargar_rankings()
    
    top = sorted(rankings.items(), 
                 key=lambda x: (-x[1]['victorias'], x[0]))[:10]
    return [{'nombre': nombre, **datos} for nombre, datos in top]

def registrar_victoria(nombre):
    
    rankings = cargar_rankings()
    if nombre not in rankings:
        rankings[nombre] = {'victorias': 0, 'partidas': 0}
    rankings[nombre]['victorias'] += 1
    rankings[nombre]['partidas'] += 1
    guardar_rankings(rankings)

def registrar_derrota(nombre):
    
    rankings = cargar_rankings()
    if nombre not in rankings:
        rankings[nombre] = {'victorias': 0, 'partidas': 0}
    rankings[nombre]['partidas'] += 1
    guardar_rankings(rankings)

def registrar_empate(nombre):
    
    rankings = cargar_rankings()
    if nombre not in rankings:
        rankings[nombre] = {'victorias': 0, 'partidas': 0}
    rankings[nombre]['partidas'] += 1
    guardar_rankings(rankings)
