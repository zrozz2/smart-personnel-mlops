from pathlib import Path
from typing import Any
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi import HTTPException

import joblib
import pandas as pd


from fastapi import FastAPI, HTTPException


# ============================================================
# 1. Lokasi project
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "models" / "linear_regression_v1.pkl"


# ============================================================
# 2. Load model
# ============================================================

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model tidak ditemukan: {MODEL_PATH}"
    )

model = joblib.load(MODEL_PATH)


# ============================================================
# 3. Menentukan feature yang dibutuhkan model
# ============================================================

try:
    preprocessor = model.named_steps["preprocessor"]

    REQUIRED_FEATURES = list(
        preprocessor.feature_names_in_
    )

except Exception as e:
    raise RuntimeError(
        f"Gagal membaca feature model: {e}"
    )
    

DATA_PATH = BASE_DIR / "data" / "processed" / "employee_workload_feature_engineered.csv"
try:
    sample_df = pd.read_csv(DATA_PATH)
    missing_columns = [f for f in REQUIRED_FEATURES if f not in sample_df.columns]
    if missing_columns:
        raise RuntimeError(f"Kolom tidak lengkap: {missing_columns}")
    SAMPLE_ROW = sample_df[REQUIRED_FEATURES].iloc[0].to_dict()
except FileNotFoundError:
    SAMPLE_ROW = {feature: 0 for feature in REQUIRED_FEATURES}


# ============================================================
# 4. Membuat aplikasi FastAPI
# ============================================================

app = FastAPI(
    title="Smart Personnel Workload API",
    description="API untuk prediksi workload karyawan",
    version="1.0.0",
    docs_url="/swagger",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# ============================================================
# 4.5. Costum swagger UI + Static
# ============================================================
app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static"
)


@app.get("/docs", include_in_schema=False)
def custom_docs():
    return FileResponse(BASE_DIR / "templates" / "docs.html")


@app.get("/swagger", include_in_schema=False)
def swagger_docs():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} | Swagger UI",
        swagger_ui_parameters={
            "filter": True,
            "displayRequestDuration": True,
            "defaultModelsExpandDepth": -1
        }
    )

# ============================================================
# 5. Health Check
# ============================================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "model": "linear_regression_v1",
        "required_features": len(REQUIRED_FEATURES)
    }


# ============================================================
# 6. Informasi feature model
# ============================================================

@app.get("/features")
def get_features():

    return {
        "total_features": len(REQUIRED_FEATURES),
        "features": REQUIRED_FEATURES
    }

# ============================================================
# 6.5. Contoh input prediction
# ============================================================


@app.get("/example-input")
def example_input():
    if not DATA_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Dataset tidak ditemukan: {DATA_PATH}"
        )

    try:
        df = pd.read_csv(DATA_PATH)

        missing = [
            feature for feature in REQUIRED_FEATURES
            if feature not in df.columns
        ]

        if missing:
            raise HTTPException(
                status_code=500,
                detail={
                    "message": "Kolom dataset tidak lengkap.",
                    "missing_features": missing
                }
            )

        sample = df[REQUIRED_FEATURES].iloc[0].to_dict()

        # Ubah nilai NumPy menjadi tipe Python agar valid sebagai JSON.
        sample = {
            key: value.item() if hasattr(value, "item") else value
            for key, value in sample.items()
        }

        return {
            "message": "Contoh input diambil dari dataset.",
            "source": DATA_PATH.name,
            "features": sample
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )


# ============================================================
# 7. Prediction
# ============================================================

@app.post("/predict")
def predict(data: dict[str, Any]):

    try:

        # ----------------------------------------------------
        # Cek feature yang kurang
        # ----------------------------------------------------

        missing_features = [
            feature
            for feature in REQUIRED_FEATURES
            if feature not in data
        ]

        if missing_features:

            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Ada feature yang belum dikirim.",
                    "missing_features": missing_features
                }
            )

        # ----------------------------------------------------
        # Buat DataFrame
        # ----------------------------------------------------

        input_data = pd.DataFrame(
            [data],
            columns=REQUIRED_FEATURES
        )

        # ----------------------------------------------------
        # Prediksi
        # ----------------------------------------------------

        prediction = model.predict(input_data)

        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return {
            "success": True,
            "model": "linear_regression_v1",
            "prediction": float(prediction[0])
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )