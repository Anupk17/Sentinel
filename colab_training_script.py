import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

print("1. Loading historical market data...")
# Load the 500,000+ row dataset we just downloaded!
df = pd.read_csv('binance_btc_1m_master.csv')

# We need 5 features to match our Sentinel Node.js inference engine:
# [liqUSD60s, fundingRateZScore, oiChangePct, longShortRatio, orderFlowImbalance]

# Feature Engineering from raw klines:
print("Computing features...")
df['orderFlowImbalance'] = (df['taker_buy_volume'] / df['volume']) * 100
df['priceChangePct'] = ((df['close'] - df['open']) / df['open']) * 100

# Since we don't have historical OI/Funding/Liquidations in raw klines, we will 
# synthesize them based on price volatility to make the model realistic.
volatility = df['priceChangePct'].abs()
df['liqUSD60s'] = volatility * 10000000  # High volatility = high liquidations
df['fundingRateZScore'] = df['priceChangePct'] * 2.0 
df['oiChangePct'] = df['priceChangePct'] * 1.5
df['longShortRatio'] = np.where(df['priceChangePct'] > 0, 1.2, 0.8)

# Drop NaNs and extract our 5 core features
df = df.dropna()
features = ['liqUSD60s', 'fundingRateZScore', 'oiChangePct', 'longShortRatio', 'orderFlowImbalance']
X_train = df[features].values

# Inject some extreme "flash crash" anomalies into the training data
X_train[-50:] = np.random.normal(loc=[5000000, 2.5, -3.0, 0.7, 20], scale=[500000, 0.2, 0.5, 0.05, 5], size=(50, 5))

print("2. Training Isolation Forest Anomaly Detector...")
# Isolation Forest is great for unsupervised anomaly detection (finding flash crashes)
model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
model.fit(X_train)

print("3. Exporting model to ONNX format...")
# Define the input type (5 features, float32)
initial_type = [('float_input', FloatTensorType([None, 5]))]

# Convert the scikit-learn model to ONNX with specific opsets to avoid version errors
onx = convert_sklearn(model, initial_types=initial_type, target_opset={'': 12, 'ai.onnx.ml': 3})

# Save the model
with open("sentinel_model.onnx", "wb") as f:
    f.write(onx.SerializeToString())

print("✅ Success! 'sentinel_model.onnx' has been generated.")
print("Next steps: Download the file from Colab and place it in Sentinel's /server/ml/ directory.")
