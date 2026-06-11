import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Embedding, LSTM, Dense, Bidirectional, Dropout, GlobalAveragePooling1D
from tensorflow.keras.preprocessing.text import tokenizer_from_json
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS_DIR = os.path.join(BASE_DIR, "datos")
MODELO_DIR = os.path.join(BASE_DIR, "modelo")
CSV_PATH = os.path.join(DATOS_DIR, "dataset_reportes.csv")

os.makedirs(MODELO_DIR, exist_ok=True)

def entrenar_modelo():
    print("Cargando el dataset...")
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"No se encontró el archivo CSV en: {CSV_PATH}. Genera primero los datos falsos.")
        
    df = pd.read_csv(CSV_PATH)
    
    # Rellenar nulos si los hubiera
    df['texto'] = df['texto'].fillna("")
    
    # 1. Codificar las etiquetas de salida
    le_categoria = LabelEncoder()
    le_criterio = LabelEncoder()
    le_formato = LabelEncoder()
    
    y_categoria = le_categoria.fit_transform(df['categoria'])
    y_criterio = le_criterio.fit_transform(df['criterio'])
    y_formato = le_formato.fit_transform(df['formato'])
    
    # Guardar las clases correspondientes a cada índice para usar en FastAPI
    metadata = {
        "categorias": list(le_categoria.classes_),
        "criterios": list(le_criterio.classes_),
        "formatos": list(le_formato.classes_),
        "max_len": 20  # Longitud máxima de secuencia fijada
    }
    
    with open(os.path.join(MODELO_DIR, "metadata_nlp.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=4)
    print("Metadata de clases guardada.")
    
    # 2. Tokenización del texto de entrada
    num_words = 1500  # Tamaño del vocabulario
    tokenizer = Tokenizer(num_words=num_words, oov_token="<OOV>")
    tokenizer.fit_on_texts(df['texto'].values)
    
    # Guardar el tokenizador en formato JSON para FastAPI
    tokenizer_json = tokenizer.to_json()
    with open(os.path.join(MODELO_DIR, "tokenizer.json"), "w", encoding="utf-8") as f:
        f.write(tokenizer_json)
    print("Tokenizer guardado.")
    
    # Convertir textos a secuencias y aplicar padding
    sequences = tokenizer.texts_to_sequences(df['texto'].values)
    max_len = metadata["max_len"]
    X = pad_sequences(sequences, maxlen=max_len, padding="post", truncating="post")
    
    # Dividir datos en entrenamiento y validación
    indices = np.arange(len(X))
    X_train, X_val, y_cat_train, y_cat_val, y_crit_train, y_crit_val, y_form_train, y_form_val = train_test_split(
        X, y_categoria, y_criterio, y_formato, test_size=0.15, random_state=42
    )
    
    # 3. Construcción del modelo multi-salida con la API Funcional de Keras
    # Entrada de texto
    input_text = Input(shape=(max_len,), name="input_texto")
    
    # Capa de Embedding (representación semántica de palabras)
    embedding_dim = 64
    x = Embedding(input_dim=num_words, output_dim=embedding_dim, mask_zero=True)(input_text)
    
    # Capa recurrente bidireccional (LSTM) para procesar el contexto en ambas direcciones
    x = Bidirectional(LSTM(64, return_sequences=False))(x)
    x = Dropout(0.3)(x)
    
    # Capas densas intermedias compartidas
    shared_dense = Dense(64, activation="relu")(x)
    shared_dense = Dropout(0.2)(shared_dense)
    
    # Salida para Categoria (Colección)
    out_categoria = Dense(len(le_categoria.classes_), activation="softmax", name="salida_categoria")(shared_dense)
    
    # Salida para Criterio (Filtro)
    out_criterio = Dense(len(le_criterio.classes_), activation="softmax", name="salida_criterio")(shared_dense)
    
    # Salida para Formato
    out_formato = Dense(len(le_formato.classes_), activation="softmax", name="salida_formato")(shared_dense)
    
    # Crear modelo
    model = Model(inputs=input_text, outputs=[out_categoria, out_criterio, out_formato])
    
    model.compile(
        optimizer="adam",
        loss={
            "salida_categoria": "sparse_categorical_crossentropy",
            "salida_criterio": "sparse_categorical_crossentropy",
            "salida_formato": "sparse_categorical_crossentropy"
        },
        metrics={
            "salida_categoria": ["accuracy"],
            "salida_criterio": ["accuracy"],
            "salida_formato": ["accuracy"]
        }
    )
    
    model.summary()
    
    # 4. Entrenar el modelo
    epochs = 12
    batch_size = 32
    
    print("\nIniciando el entrenamiento del modelo NLP...")
    history = model.fit(
        X_train,
        {
            "salida_categoria": y_cat_train,
            "salida_criterio": y_crit_train,
            "salida_formato": y_form_train
        },
        validation_data=(
            X_val,
            {
                "salida_categoria": y_cat_val,
                "salida_criterio": y_crit_val,
                "salida_formato": y_form_val
            }
        ),
        epochs=epochs,
        batch_size=batch_size,
        verbose=1
    )
    
    # 5. Guardar el modelo entrenado
    model_path = os.path.join(MODELO_DIR, "modelo_reportes_nlp.keras")
    model.save(model_path)
    print(f"\nModelo entrenado y guardado con éxito en: {model_path}")

if __name__ == "__main__":
    entrenar_modelo()
