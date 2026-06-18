import os
import joblib
import pymysql
import requests
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from train import train_model

# Load environment variables
load_dotenv(dotenv_path='../Backend/.env')

app = Flask(__name__)
CORS(app)

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', '')
DB_NAME = os.getenv('DB_NAME', 'smartmonitor_db')
BACKEND_PORT = os.getenv('PORT', '5000')
BACKEND_URL = f"http://localhost:{BACKEND_PORT}"

# Global token storage
backend_token = None

def get_backend_token():
    global backend_token
    if backend_token:
        return backend_token
    try:
        response = requests.post(f"{BACKEND_URL}/api/auth/login", json={
            "email": "admin@smartmonitor.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            backend_token = data.get('token')
            return backend_token
    except Exception as e:
        print(f"Authentication with backend failed: {e}")
    return None

def load_failure_model():
    model_path = 'models/failure_model.joblib'
    if not os.path.exists(model_path):
        print("Model file not found. Auto-training model...")
        train_model()
    
    if os.path.exists(model_path):
        return joblib.load(model_path)
    return None

# Load the model on start
model_data = load_failure_model()

def get_recent_measurements(equipment_id, limit=10):
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT temperature, voltage, vibration, pressure, consumption "
                "FROM measurements WHERE equipment_id = %s "
                "ORDER BY created_at DESC LIMIT %s",
                (equipment_id, limit)
            )
            rows = cursor.fetchall()
        return rows
    except Exception as e:
        print(f"Error querying DB for recent measurements: {e}")
        return []

def analyze_risk_factors(data):
    """
    Explain why the risk score is high
    """
    factors = []
    if data['temperature'] > 80:
        factors.append("Surchauffe thermique détectée")
    if data['vibration'] > 7.5:
        factors.append("Vibrations mécaniques anormales")
    if data['pressure'] > 110:
        factors.append("Pression hydraulique critique")
    if data['voltage'] > 240:
        factors.append("Surtension électrique")
    elif data['voltage'] < 190:
        factors.append("Sous-tension électrique")
    if data['consumption'] > 450:
        factors.append("Consommation d'énergie excessive")
    
    if not factors:
        return "Paramètres de fonctionnement nominaux."
    return ", ".join(factors)

@app.route('/predict/<int:equipment_id>', methods=['GET', 'POST'])
def predict_equipment(equipment_id):
    global model_data
    if not model_data:
        model_data = load_failure_model()
        if not model_data:
            return jsonify({"error": "Model not available"}), 500
            
    recent_rows = get_recent_measurements(equipment_id)
    if not recent_rows:
        return jsonify({"message": f"No measurements found for equipment #{equipment_id}"}), 404
        
    # Compute rolling averages
    df_recent = pd.DataFrame(recent_rows)
    avg_data = df_recent.mean().to_dict()
    
    # Run prediction
    model = model_data['model']
    features = model_data['features']
    
    input_vector = [avg_data.get(feat, 0.0) for feat in features]
    prediction_proba = model.predict_proba([input_vector])[0]
    
    # Class 1 probability represents risk score
    risk_score = round(prediction_proba[1] * 100, 2)
    
    # Construct recommendation / prediction text
    factors = analyze_risk_factors(avg_data)
    if risk_score >= 70:
        prediction_text = f"Risque critique de défaillance ({risk_score}%). Facteurs : {factors}. Maintenance recommandée sous 48h."
    elif risk_score >= 40:
        prediction_text = f"Risque modéré de défaillance ({risk_score}%). Facteurs : {factors}. Inspection recommandée dans les 7 jours."
    else:
        prediction_text = f"Équipement en bonne santé ({risk_score}%). {factors}"
        
    # Call backend to save prediction
    token = get_backend_token()
    saved_on_backend = False
    backend_response = None
    
    if token:
        try:
            headers = {"Authorization": f"Bearer {token}"}
            payload = {
                "equipment_id": equipment_id,
                "risk_score": risk_score,
                "prediction": prediction_text
            }
            res = requests.post(f"{BACKEND_URL}/api/predictions", json=payload, headers=headers)
            saved_on_backend = res.status_code == 201
            backend_response = res.json() if res.status_code in [200, 201] else res.text
        except Exception as e:
            print(f"Error calling backend to save prediction: {e}")
            backend_response = str(e)
            
    return jsonify({
        "equipment_id": equipment_id,
        "recent_measurements_analyzed": len(recent_rows),
        "averages": avg_data,
        "risk_score": risk_score,
        "prediction": prediction_text,
        "saved_to_db": saved_on_backend,
        "backend_response": backend_response
    })

@app.route('/predict_all', methods=['GET', 'POST'])
def predict_all_equipments():
    # Get all active equipments
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM equipments WHERE status != 'Arrêté'")
            equipments = cursor.fetchall()
    except Exception as e:
        return jsonify({"error": f"Failed to fetch equipments: {e}"}), 500
        
    results = []
    for eq in equipments:
        eq_id = eq['id']
        # Call internal predict_equipment logic
        try:
            recent_rows = get_recent_measurements(eq_id)
            if not recent_rows:
                continue
            
            df_recent = pd.DataFrame(recent_rows)
            avg_data = df_recent.mean().to_dict()
            
            model = model_data['model']
            features = model_data['features']
            input_vector = [avg_data.get(feat, 0.0) for feat in features]
            prediction_proba = model.predict_proba([input_vector])[0]
            risk_score = round(prediction_proba[1] * 100, 2)
            
            factors = analyze_risk_factors(avg_data)
            if risk_score >= 70:
                prediction_text = f"Risque critique de défaillance ({risk_score}%). Facteurs : {factors}. Maintenance recommandée sous 48h."
            elif risk_score >= 40:
                prediction_text = f"Risque modéré de défaillance ({risk_score}%). Facteurs : {factors}. Inspection recommandée dans les 7 jours."
            else:
                prediction_text = f"Équipement en bonne santé ({risk_score}%). {factors}"
                
            # Post to backend
            token = get_backend_token()
            saved = False
            if token:
                headers = {"Authorization": f"Bearer {token}"}
                payload = {
                    "equipment_id": eq_id,
                    "risk_score": risk_score,
                    "prediction": prediction_text
                }
                res = requests.post(f"{BACKEND_URL}/api/predictions", json=payload, headers=headers)
                saved = res.status_code == 201
                
            results.append({
                "equipment_id": eq_id,
                "name": eq['name'],
                "risk_score": risk_score,
                "prediction": prediction_text,
                "saved": saved
            })
        except Exception as e:
            print(f"Error predicting for equipment #{eq_id}: {e}")
            
    return jsonify({"predictions": results})

@app.route('/train', methods=['POST'])
def trigger_training():
    global model_data
    try:
        train_model()
        model_data = load_failure_model()
        return jsonify({"message": "Model retrained successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Start server
    app.run(host='0.0.0.0', port=8000, debug=True)
