
import pandas as pd
import os
import json
import shutil
import sqlite3

class DatasetService:
    def __init__(self, data_dir):
        self.data_dir = data_dir

    def _load_df(self, filename):
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Dataset {filename} not found")
        
        if filename.endswith('.csv'):
            return pd.read_csv(filepath)
        elif filename.endswith('.json'):
            return pd.read_json(filepath)
        elif filename.endswith('.jsonl'):
            return pd.read_json(filepath, lines=True)
        else:
            raise ValueError("Unsupported file format")

    def _save_df(self, df, filename):
        filepath = os.path.join(self.data_dir, filename)
        ext = os.path.splitext(filename)[1]
        
        if ext == '.csv':
            df.to_csv(filepath, index=False)
        elif ext == '.json':
            df.to_json(filepath, orient='records')
        elif ext == '.jsonl':
            df.to_json(filepath, orient='records', lines=True)

    def get_preview(self, filename, n=10):
        try:
            df = self._load_df(filename)
            return df.head(n).to_dict(orient='records')
        except Exception as e:
            return {"error": str(e)}

    def get_stats(self, filename):
        try:
            df = self._load_df(filename)
            desc = df.describe(include='all').to_dict()
            return {
                "rows": len(df),
                "columns": list(df.columns),
                "missing_values": df.isnull().sum().to_dict(),
                "description": desc
            }
        except Exception as e:
            return {"error": str(e)}

    def clean_dataset(self, filename, operations):
        try:
            df = self._load_df(filename)
            report = []
            
            for op in operations:
                if op['type'] == 'drop_duplicates':
                    initial_len = len(df)
                    df.drop_duplicates(inplace=True)
                    report.append(f"Dropped {initial_len - len(df)} duplicate rows.")
                elif op['type'] == 'drop_na':
                    initial_len = len(df)
                    df.dropna(inplace=True)
                    report.append(f"Dropped {initial_len - len(df)} rows with missing values.")
                elif op['type'] == 'fill_na':
                    val = op.get('value', 0)
                    df.fillna(val, inplace=True)
                    report.append(f"Filled missing values with {val}.")
            
            base, ext = os.path.splitext(filename)
            new_filename = f"{base}_cleaned{ext}"
            self._save_df(df, new_filename)
                
            return {"status": "success", "new_file": new_filename, "report": report}
        except Exception as e:
            return {"error": str(e)}

    def apply_transform(self, filename, transform_type, column):
        try:
            df = self._load_df(filename)
            if column not in df.columns:
                return {"error": f"Column {column} not found"}

            if transform_type == 'normalize':
                # Min-Max Scaling
                if pd.api.types.is_numeric_dtype(df[column]):
                    min_val = df[column].min()
                    max_val = df[column].max()
                    if max_val - min_val == 0:
                        return {"error": "Column has zero variance, cannot normalize"}
                    df[column] = (df[column] - min_val) / (max_val - min_val)
                else:
                    return {"error": "Column must be numeric"}
                    
            elif transform_type == 'standardize':
                # Z-Score
                if pd.api.types.is_numeric_dtype(df[column]):
                    mean = df[column].mean()
                    std = df[column].std()
                    if std == 0:
                         return {"error": "Column has zero variance, cannot standardize"}
                    df[column] = (df[column] - mean) / std
                else:
                    return {"error": "Column must be numeric"}
            
            elif transform_type == 'log':
                import numpy as np
                if pd.api.types.is_numeric_dtype(df[column]):
                    if (df[column] <= 0).any():
                         return {"error": "Column contains non-positive values, cannot log transform"}
                    df[column] = np.log(df[column])
                else:
                    return {"error": "Column must be numeric"}
                    
            elif transform_type == 'onehot':
                # One Hot Encoding
                dummies = pd.get_dummies(df[column], prefix=column)
                df = pd.concat([df, dummies], axis=1)
                df.drop(column, axis=1, inplace=True)
                
            else:
                return {"error": "Unknown transform type"}
                
            self._save_df(df, filename)
            return {"status": "success", "rows": len(df), "columns": list(df.columns)}
            
        except Exception as e:
            return {"error": str(e)}

    def split_dataset(self, filename, train_ratio=0.8):
        try:
            df = self._load_df(filename)
            train_size = int(len(df) * train_ratio)
            train_df = df.iloc[:train_size]
            test_df = df.iloc[train_size:]
            
            base, ext = os.path.splitext(filename)
            train_file = f"{base}_train{ext}"
            test_file = f"{base}_test{ext}"
            
            self._save_df(train_df, train_file)
            self._save_df(test_df, test_file)

            return {"status": "success", "train_file": train_file, "test_file": test_file, "train_count": len(train_df), "test_count": len(test_df)}
        except Exception as e:
            return {"error": str(e)}

    def add_row(self, filename, row_data):
        try:
            df = self._load_df(filename)
            new_row = pd.DataFrame([row_data])
            df = pd.concat([df, new_row], ignore_index=True)
            self._save_df(df, filename)
            return {"status": "success", "rows": len(df)}
        except Exception as e:
            return {"error": str(e)}

    def update_row(self, filename, index, row_data):
        try:
            df = self._load_df(filename)
            if index < 0 or index >= len(df):
                return {"error": "Index out of bounds"}
            
            for k, v in row_data.items():
                if k in df.columns:
                    df.at[index, k] = v
                    
            self._save_df(df, filename)
            return {"status": "success"}
        except Exception as e:
            return {"error": str(e)}

    def run_sql_query(self, filename, query):
        try:
            df = self._load_df(filename)
            conn = sqlite3.connect(':memory:')
            df.to_sql('dataset', conn, index=False, if_exists='replace')
            result_df = pd.read_sql_query(query, conn)
            conn.close()
            
            return {
                "columns": list(result_df.columns),
                "data": result_df.head(100).to_dict(orient='records'),
                "rows": len(result_df)
            }
        except Exception as e:
            return {"error": str(e)}

    def get_column_distribution(self, filename, column):
        try:
            df = self._load_df(filename)
            if column not in df.columns:
                return {"error": "Column not found"}
            
            if pd.api.types.is_numeric_dtype(df[column]):
                hist = df[column].value_counts(bins=10).sort_index()
                return {
                    "type": "numeric",
                    "labels": [f"{i.left:.2f}-{i.right:.2f}" for i in hist.index],
                    "values": hist.values.tolist()
                }
            else:
                counts = df[column].value_counts().head(10)
                return {
                    "type": "categorical",
                    "labels": counts.index.tolist(),
                    "values": counts.values.tolist()
                }
        except Exception as e:
            return {"error": str(e)}

    def version_dataset(self, filename, version_tag):
        try:
            timestamp = pd.Timestamp.now().strftime("%Y%m%d%H%M%S")
            base, ext = os.path.splitext(filename)
            new_name = f"{base}_v{version_tag}_{timestamp}{ext}"
            
            src = os.path.join(self.data_dir, filename)
            dst = os.path.join(self.data_dir, new_name)
            
            shutil.copy2(src, dst)
            return {"status": "success", "new_file": new_name}
        except Exception as e:
            return {"error": str(e)}

    def check_drift(self, file_a, file_b):
        try:
            df_a = self._load_df(file_a)
            df_b = self._load_df(file_b)
            
            report = {}
            numeric_cols = df_a.select_dtypes(include=['number']).columns
            for col in numeric_cols:
                if col in df_b.columns:
                    mean_a = df_a[col].mean()
                    mean_b = df_b[col].mean()
                    drift_pct = abs((mean_b - mean_a) / (mean_a + 1e-9)) * 100
                    report[col] = {
                        "mean_a": round(mean_a, 4), 
                        "mean_b": round(mean_b, 4), 
                        "drift_pct": round(drift_pct, 2),
                        "status": "DRIFT DETECTED" if drift_pct > 10 else "STABLE"
                    }
            return report
        except Exception as e:
            return {"error": str(e)}

    def get_schema(self, filename):
        try:
            df = self._load_df(filename)
            schema = []
            for col in df.columns:
                dtype = str(df[col].dtype)
                schema.append({
                    "column": col,
                    "type": dtype,
                    "non_null": int(df[col].count()),
                    "unique": int(df[col].nunique()),
                    "example": str(df[col].iloc[0]) if len(df) > 0 else ""
                })
            return schema
        except Exception as e:
            return {"error": str(e)}

    def backup_dataset(self, filename):
        try:
            timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
            base, ext = os.path.splitext(filename)
            backup_name = f"BACKUP_{base}_{timestamp}{ext}"
            
            src = os.path.join(self.data_dir, filename)
            dst = os.path.join(self.data_dir, backup_name)
            
            shutil.copy2(src, dst)
            return {"status": "success", "backup_file": backup_name}
        except Exception as e:
            return {"error": str(e)}
            
    
    def get_insights(self, filename):
        try:
            df = self._load_df(filename)
            insights = []
            
            # 1. Correlation (Numerical)
            num_df = df.select_dtypes(include=['number'])
            if not num_df.empty and len(num_df.columns) > 1:
                corr = num_df.corr().abs()
                # Find high correlations
                import numpy as np
                # Select upper triangle
                upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
                to_drop = [column for column in upper.columns if any(upper[column] > 0.8)]
                if to_drop:
                    insights.append({
                        "type": "correlation",
                        "text": f"High correlation detected in columns: {', '.join(to_drop)}. Consider removing redundancy."
                    })
            
            # 2. Missing Analysis
            missing = df.isnull().mean()
            high_missing = missing[missing > 0.2].index.tolist()
            if high_missing:
                insights.append({
                    "type": "quality",
                    "text": f"Columns with >20% missing data: {', '.join(high_missing)}."
                })
                
            # 3. Categorical Balance
            cat_df = df.select_dtypes(include=['object', 'category'])
            for col in cat_df.columns:
                if df[col].nunique() < 10:
                    top_freq = df[col].value_counts(normalize=True).iloc[0]
                    if top_freq > 0.8:
                        insights.append({
                            "type": "balance", 
                            "text": f"Column '{col}' is imbalanced ({(top_freq*100):.1f}% same value)."
                        })

            if not insights:
                insights.append({"type": "info", "text": "No critical issues detected. Dataset looks healthy."})
                
            return insights
        except Exception as e:
            return [{"type": "error", "text": str(e)}]

    def simulated_training(self, filename, target_col):
        try:
            # Mock training process
            import time
            df = self._load_df(filename)
            
            if target_col not in df.columns:
                return {"error": "Target column not found"}
            
            # Fake metrics based on data size
            rows = len(df)
            base_acc = 0.70 + (min(rows, 10000)/100000)
            
            # Simulate "epochs"
            history = []
            for i in range(1, 11):
                acc = base_acc + (i * 0.015) - (0.005 * (i%2))
                loss = 1.0 - acc
                history.append({"epoch": i, "accuracy": round(acc, 4), "loss": round(loss, 4)})
            
            return {
                "status": "success",
                "model_type": "RandomForestClassifier (Simulated)",
                "final_accuracy": f"{history[-1]['accuracy']*100:.2f}%",
                "history": history
            }
        except Exception as e:
            return {"error": str(e)}

    def get_public_datasets(self, source='all'):
        datasets = []
        
        # NeuroForge Defaults
        if source in ['all', 'neuroforge']:
            datasets.extend([
                {"id": "nf_titanic", "name": "Titanic Survivors", "source": "NeuroForge", "category": "Classification", "size": "56KB", "desc": "Passenger survival prediction."},
                {"id": "nf_prices", "name": "Housing Prices", "source": "NeuroForge", "category": "Regression", "size": "120KB", "desc": "Predict house prices."}
            ])
            
        # Hugging Face Mocks
        if source in ['all', 'huggingface']:
            datasets.extend([
                {"id": "hf_mnist", "name": "MNIST", "source": "Hugging Face", "category": "Computer Vision", "size": "11MB", "desc": "70k images of handwritten digits."},
                {"id": "hf_squad", "name": "SQuAD", "source": "Hugging Face", "category": "NLP", "size": "30MB", "desc": "Stanford Question Answering Dataset."},
                {"id": "hf_imdb", "name": "IMDB Reviews", "source": "Hugging Face", "category": "NLP", "size": "80MB", "desc": "Large movie review dataset for sentiment analysis."}
            ])

        # Kaggle Mocks
        if source in ['all', 'kaggle']:
            datasets.extend([
                {"id": "kg_credit", "name": "Credit Card Fraud", "source": "Kaggle", "category": "Finance", "size": "66MB", "desc": "Anonymized credit card transactions."},
                {"id": "kg_sales", "name": "Store Sales Forecast", "source": "Kaggle", "category": "Time Series", "size": "5MB", "desc": "Predict grocery sales."}
            ])
            
        return datasets

    def upload_to_cloud(self, filename, platform):
        """Mock upload to external cloud platform."""
        try:
            if not os.path.exists(os.path.join(self.data_dir, filename)):
                 return {"error": "File not found"}
            
            # Simulate upload delay
            import time
            time.sleep(1) 
            
            return {
                "status": "success", 
                "message": f"Dataset {filename} successfully pushed to {platform}.",
                "cloud_id": f"{platform.lower()}/{filename}"
            }
        except Exception as e:
            return {"error": str(e)}

    def download_public_dataset(self, dataset_id):
        try:
            # In a real app, this would download from URL. 
            # Here we just generate a dummy file matching the ID.
            filename = f"{dataset_id}.csv"
            filepath = os.path.join(self.data_dir, filename)
            
            # Generate dummy content if not exists
            if not os.path.exists(filepath):
                if "titantic" in dataset_id:
                    data = "pclass,survived,name,sex,age\n1,1,Allen,female,29\n1,1,Allison,male,0.92\n"
                elif "house" in dataset_id:
                    data = "sqft,bedrooms,bathrooms,price\n1500,3,2,300000\n2000,4,3,450000\n"
                else:
                    data = "id,feature_1,feature_2,label\n1,0.5,0.2,1\n2,0.1,0.9,0\n"
                
                with open(filepath, 'w') as f:
                    f.write(data)
                    
            return {"status": "success", "file": filename}
        except Exception as e:
            return {"error": str(e)}

    def rename_column(self, filename, old_name, new_name):
        try:
            df = self._load_df(filename)
            if old_name not in df.columns:
                return {"error": f"Column {old_name} not found"}
            
            df.rename(columns={old_name: new_name}, inplace=True)
            self._save_df(df, filename)
            return {"status": "success", "columns": list(df.columns)}
        except Exception as e:
            return {"error": str(e)}

    def generate_synthetic_row(self, filename):
        try:
            df = self._load_df(filename)
            import random
            import string
            import numpy as np
            
            new_row = {}
            for col in df.columns:
                dtype = df[col].dtype
                if pd.api.types.is_numeric_dtype(dtype):
                    if df[col].dropna().empty:
                        val = 0
                    else:
                        min_v = df[col].min()
                        max_v = df[col].max()
                        val = random.uniform(float(min_v), float(max_v))
                        if pd.api.types.is_integer_dtype(dtype):
                            val = int(val)
                    new_row[col] = val
                else:
                    # Pick a random existing value or random string
                    if df[col].nunique() < 20 and not df[col].empty:
                         new_row[col] = random.choice(df[col].dropna().unique().tolist())
                    else:
                        new_row[col] = ''.join(random.choices(string.ascii_letters, k=8))
            
            # Add to DF
            row_df = pd.DataFrame([new_row])
            df = pd.concat([df, row_df], ignore_index=True)
            self._save_df(df, filename)
            
            return {"status": "success", "row": new_row, "total_rows": len(df)}
        except Exception as e:
            return {"error": str(e)}

    def download_dataset(self, filename, format='csv'):
        try:
            df = self._load_df(filename)
            base, _ = os.path.splitext(filename)
            
            # Temporary export path
            export_name = f"{base}_export.{format}"
            export_path = os.path.join(self.data_dir, export_name)
            
            if format == 'csv':
                df.to_csv(export_path, index=False)
            elif format == 'json':
                df.to_json(export_path, orient='records')
            else:
                 return {"error": "Unsupported format"}
                 
            return {"status": "success", "file": export_name, "path": export_path}
        except Exception as e:
            return {"error": str(e)}

    def get_utilization(self, filename):
        """
        Mock utilization data: shows where this dataset is being used.
        """
        try:
            # Deterministic mock based on filename length
            seed = len(filename)
            used_in_rag = seed % 2 == 0
            used_in_models = (seed % 3) + 1
            api_calls = seed * 150
            
            integrations = []
            if used_in_rag:
                integrations.append({"name": "Knowledge Base (RAG)", "status": "active", "type": "internal"})
            
            integrations.append({"name": "Training Pipeline", "status": "idle", "type": "internal"})
            integrations.append({"name": "External API Gateway", "status": "connected", "type": "external"})
            
            return {
                "utilization_score": min(98, seed * 5),
                "active_models": used_in_models,
                "monthly_api_calls": api_calls,
                "integrations": integrations,
                "last_accessed": "2 hours ago"
            }
        except Exception as e:
            return {"error": str(e)}
