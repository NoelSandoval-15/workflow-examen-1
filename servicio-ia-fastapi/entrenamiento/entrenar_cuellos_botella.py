import os
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, Input

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELO_DIR = os.path.join(BASE_DIR, "modelo")
MODELO_PATH = os.path.join(MODELO_DIR, "modelo_cuello_botella.keras")
METADATA_PATH = os.path.join(MODELO_DIR, "metadata_cuello_botella.json")

os.makedirs(MODELO_DIR, exist_ok=True)

def generar_datos_sinteticos(n_samples=2500):
    """
    Genera un conjunto de datos sintéticos representando estadísticas de nodos en flujos
    para clasificar el nivel de severidad de cuello de botella: BAJA (0), MEDIA (1), ALTA (2).
    """
    np.random.seed(42)
    
    # 1. Variables base aleatorias
    # Tiempo promedio real de resolución (de 0 a 100 horas)
    tiempo_promedio = np.random.uniform(0.0, 100.0, n_samples)
    # Tiempos límites configurados más comunes (4, 8, 12, 24, 48, 72, 96 horas)
    tiempo_limite = np.random.choice([4.0, 8.0, 12.0, 24.0, 48.0, 72.0, 96.0], size=n_samples)
    # Tareas pendientes totales (de 0 a 40)
    pendientes = np.random.randint(0, 40, size=n_samples)
    # Tareas atrasadas (debe ser menor o igual a pendientes)
    atrasadas = np.array([np.random.randint(0, p + 1) if p > 0 else 0 for p in pendientes])
    
    # 2. Ratios matemáticos calculados
    ratio_tiempos = tiempo_promedio / (tiempo_limite + 1e-5)
    ratio_atrasadas = atrasadas / (pendientes + 1e-5)
    
    # 3. Reglas de etiquetado lógico para simular cuellos de botella reales
    y = []
    for i in range(n_samples):
        att = atrasadas[i]
        rt = ratio_tiempos[i]
        
        # Regla para ALTA (2)
        if att >= 3 or rt >= 1.3:
            y.append(2)
        # Regla para MEDIA (1)
        elif att >= 1 or rt >= 0.8:
            y.append(1)
        # Regla para BAJA (0)
        else:
            y.append(0)
            
    y = np.array(y)
    
    # Combinar características en matriz X
    # Características: [tiempo_promedio, tiempo_limite, ratio_tiempos, pendientes, atrasadas, ratio_atrasadas]
    X = np.column_stack((
        tiempo_promedio,
        tiempo_limite,
        ratio_tiempos,
        pendientes.astype(float),
        atrasadas.astype(float),
        ratio_atrasadas
    ))
    
    return X, y

def entrenar_modelo_botella():
    print("Iniciando entrenamiento del modelo de cuello de botella local...")
    X, y = generar_datos_sinteticos(3000)
    
    # Dividir en entrenamiento y validación
    split_idx = int(len(X) * 0.85)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    
    # Construcción de la red neuronal densa secuencial con Keras
    model = Sequential([
        Input(shape=(6,), name="features_entrada"),
        Dense(32, activation="relu"),
        Dropout(0.1),
        Dense(16, activation="relu"),
        Dropout(0.1),
        Dense(3, activation="softmax", name="salida_severidad")
    ])
    
    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    
    print("Entrenando red neuronal...")
    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=30,
        batch_size=32,
        verbose=1
    )
    
    # Evaluar modelo
    loss, acc = model.evaluate(X_val, y_val, verbose=0)
    print(f"Modelo entrenado con éxito. Precisión final: {acc*100:.2f}%, Pérdida: {loss:.4f}")
    
    # Guardar modelo en formato Keras
    model.save(MODELO_PATH)
    print(f"Modelo guardado en: {MODELO_PATH}")
    
    # Guardar metadatos y clases de severidad
    metadata = {
        "clases": ["BAJA", "MEDIA", "ALTA"],
        "caracteristicas": ["tiempo_promedio", "tiempo_limite", "ratio_tiempos", "pendientes", "atrasadas", "ratio_atrasadas"]
    }
    
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=4)
    print(f"Metadatos guardados en: {METADATA_PATH}")

if __name__ == "__main__":
    entrenar_modelo_botella()
