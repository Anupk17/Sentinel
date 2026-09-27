import os
import urllib.request
import zipfile
import pandas as pd

# Download Binance Futures BTCUSDT 1m klines for a full year
base_url = "https://data.binance.vision/data/futures/um/monthly/klines/BTCUSDT/1m/"
months = [f"2023-{str(i).zfill(2)}" for i in range(1, 13)]

os.makedirs("data", exist_ok=True)
csv_files = []

print("Downloading Binance Historical Futures Data (BTCUSDT 1m)...")
for month in months:
    filename = f"BTCUSDT-1m-{month}.zip"
    url = base_url + filename
    filepath = os.path.join("data", filename)
    
    if not os.path.exists(filepath):
        try:
            print(f"Downloading {filename}...")
            urllib.request.urlretrieve(url, filepath)
        except Exception as e:
            print(f"Failed to download {filename}: {e}")
            continue
            
    # Extract the ZIP
    try:
        with zipfile.ZipFile(filepath, 'r') as zip_ref:
            zip_ref.extractall("data")
            csv_name = filename.replace('.zip', '.csv')
            csv_files.append(os.path.join("data", csv_name))
    except Exception as e:
        print(f"Failed to extract {filename}: {e}")

print("\nConcatenating data...")
# Standard Binance Kline columns
columns = [
    "open_time", "open", "high", "low", "close", "volume",
    "close_time", "quote_volume", "count",
    "taker_buy_volume", "taker_buy_quote_volume", "ignore"
]

dfs = []
for csv_file in csv_files:
    if os.path.exists(csv_file):
        df = pd.read_csv(csv_file, names=columns)
        dfs.append(df)

if dfs:
    master_df = pd.concat(dfs, ignore_index=True)
    # Convert timestamps to readable datetime, coerce errors in case of stray header rows
    master_df['open_time'] = pd.to_numeric(master_df['open_time'], errors='coerce')
    master_df = master_df.dropna(subset=['open_time'])
    
    master_df['open_time'] = pd.to_datetime(master_df['open_time'], unit='ms')
    master_df['close_time'] = pd.to_numeric(master_df['close_time'], errors='coerce')
    master_df['close_time'] = pd.to_datetime(master_df['close_time'], unit='ms')
    
    # Save the master dataset
    master_df.to_csv("binance_btc_1m_master.csv", index=False)
    print(f"✅ Success! Saved {len(master_df)} rows to 'binance_btc_1m_master.csv'.")
    print("This is over half a million rows of real market data, ready for Colab training!")
else:
    print("No data was downloaded.")
