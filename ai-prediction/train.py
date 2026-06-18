import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import pymysql
from dotenv import load_dotenv

# Load env variables from backend if needed
load_dotenv(dotenv_path='../Backend/.env')

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', '')
DB_NAME = os.getenv('DB_NAME', 'smartmonitor_db')

def fetch_data_from_db():
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
        with connection.cursor() as cursor:
            # Fetch measurements
            cursor.execute("SELECT * FROM measurements ORDER BY created_at ASC")
            measurements = cursor.fetchall()
            
            # Fetch alerts to identify historical failure/anomalous times
            cursor.execute("SELECT * FROM alerts")
            alerts = cursor.fetchall()
            
        return pd.DataFrame(measurements), pd.DataFrame(alerts)
    except Exception as e:
        print(f"Error fetching data from DB: {e}")
        return pd.DataFrame(), pd.DataFrame()

def generate_synthetic_data(num_samples=1000):
    """
    Generate synthetic data for training the failure prediction model.
    Features: temperature, voltage, vibration, pressure, consumption
    Target: failure (0: Normal, 1: High Risk/Failure)
    """
    np.random.seed(42)
    
    # Normal operations
    normal_temp = np.random.normal(65, 8, num_samples // 2)
    normal_volt = np.random.normal(220, 10, num_samples // 2)
    normal_vib = np.random.normal(3.0, 1.2, num_samples // 2)
    normal_press = np.random.normal(75, 15, num_samples // 2)
    normal_cons = np.random.normal(250, 50, num_samples // 2)
    
    # Limit anomalies for normal data
    normal_temp = np.clip(normal_temp, 40, 84)
    normal_vib = np.clip(normal_vib, 0.5, 7.9)
    
    df_normal = pd.DataFrame({
        'temperature': normal_temp,
        'voltage': normal_volt,
        'vibration': normal_vib,
        'pressure': normal_press,
        'consumption': normal_cons,
        'failure': 0
    })
    
    # Anomalies / Failure states
    fail_temp = np.random.normal(90, 5, num_samples // 2)
    fail_volt = np.random.normal(260, 20, num_samples // 2) # Surtension
    fail_vib = np.random.normal(9.5, 1.5, num_samples // 2) # Vibration excessive
    fail_press = np.random.normal(130, 20, num_samples // 2) # Surpression
    fail_cons = np.random.normal(540, 40, num_samples // 2) # Consommation excessive
    
    df_fail = pd.DataFrame({
        'temperature': fail_temp,
        'voltage': fail_volt,
        'vibration': fail_vib,
        'pressure': fail_press,
        'consumption': fail_cons,
        'failure': 1
    })
    
    df = pd.concat([df_normal, df_fail]).sample(frac=1).reset_index(drop=True)
    return df

def train_model():
    print("Fetching training data...")
    df_m, df_a = fetch_data_from_db()
    
    # If we have database measurements and alert labels, we can combine them.
    # Otherwise, or if database has less than 200 rows, use high-quality synthetic data
    if len(df_m) > 200:
        print(f"Using {len(df_m)} DB measurements for training...")
        # Simple labeling based on threshold limits or matching alerts
        df_m['failure'] = 0
        
        # Label failure if temperature > 85 OR vibration > 8 OR consumption > 500 OR pressure > 120 OR voltage > 250
        df_m.loc[
            (df_m['temperature'] > 85) | 
            (df_m['vibration'] > 8) | 
            (df_m['pressure'] > 120) | 
            (df_m['voltage'] > 250) | 
            (df_m['consumption'] > 500), 
            'failure'
        ] = 1
        
        features = ['temperature', 'voltage', 'vibration', 'pressure', 'consumption']
        X = df_m[features].astype(float)
        y = df_m['failure'].astype(int)
    else:
        print("Insufficient DB measurements. Generating synthetic training dataset...")
        df = generate_synthetic_data(1000)
        features = ['temperature', 'voltage', 'vibration', 'pressure', 'consumption']
        X = df[features]
        y = df['failure']
        
    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)
    
    # Save model and features
    model_data = {
        'model': clf,
        'features': features
    }
    
    os.makedirs('models', exist_ok=True)
    joblib.dump(model_data, 'models/failure_model.joblib')
    print("Model saved to models/failure_model.joblib")

if __name__ == '__main__':
    train_model()
