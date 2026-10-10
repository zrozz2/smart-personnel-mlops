import pypandoc

readme = r"""
# Smart Personnel MLOps

Sistem machine learning untuk memperkirakan jumlah tugas yang diselesaikan karyawan berdasarkan indikator aktivitas, beban kerja, dan produktivitas. Proyek ini mencakup pipeline pemrosesan data, evaluasi model, pencatatan eksperimen dengan MLflow, penyimpanan model, serta REST API berbasis FastAPI dengan portal dokumentasi interaktif.

> **Catatan penggunaan:** dataset proyek ini bersifat sintetis/latihan. Prediksi hanya merupakan estimasi model dan tidak boleh digunakan sebagai satu-satunya dasar untuk keputusan kepegawaian, penilaian individu, pengurangan pegawai, atau keputusan berdampak tinggi lainnya.

## Fitur utama

- Exploratory Data Analysis (EDA) dan pemeriksaan kualitas data.
- Pembersihan data serta rekayasa fitur.
- Pelatihan dan evaluasi model regresi.
- Pelacakan eksperimen menggunakan MLflow.
- Penyimpanan model hasil pelatihan ke file lokal.
- REST API untuk pemeriksaan status, inspeksi feature, contoh input, dan prediksi.
- Portal dokumentasi dengan tampilan khusus serta akses ke Swagger UI.
- Pengujian endpoint API.
- Containerisasi menggunakan Docker.

## Teknologi

- Python
- pandas dan NumPy
- scikit-learn
- MLflow
- FastAPI
- Uvicorn
- joblib
- pytest
- Docker

## Struktur proyek

```text
smart-personnel-mlops/
├── data/
│   ├── raw/
│   └── processed/
│       ├── employee_workload_cleaned.csv
│       ├── employee_workload_consistent.csv
│       └── employee_workload_feature_engineered.csv
├── models/
│   └── linear_regression_v1.pkl
├── notebooks/
│   ├── 01-04_EDA_to_Modeling.ipynb
│   ├── 05_mlflow_tracking.ipynb
│   ├── 06_model_persistence.ipynb
│   └── 07_model_schema.ipynb
├── src/
│   ├── __init__.py
│   └── api.py
├── static/
│   ├── portal.css
│   └── portal.js
├── templates/
│   └── docs.html
├── tests/
│   └── test_api.py
├── Dockerfile
├── requirements.txt
└── README.md
```

Nama file atau folder dapat berbeda jika struktur proyek lokal telah dikembangkan. Pastikan dataset, model, template, dan file statis benar-benar tersedia di lokasi yang digunakan aplikasi.

## Persyaratan

- Python yang kompatibel dengan versi library di `requirements.txt`.
- Git (opsional, jika menggunakan version control).
- Docker Desktop jika ingin menjalankan aplikasi dalam container.
- Dataset yang diperlukan dan file model `models/linear_regression_v1.pkl`.

## Menjalankan secara lokal di Windows

Buka PowerShell pada direktori proyek:

```powershell
cd C:\MLProjects\smart-personnel-mlops
```

### 1. Aktifkan virtual environment

Jika virtual environment `.venv` sudah tersedia:

```powershell
.\.venv\Scripts\Activate.ps1
```

Jika belum tersedia, buat terlebih dahulu:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Instal dependensi

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Pastikan `requirements.txt` memuat dependensi aplikasi yang dipakai, termasuk FastAPI, Uvicorn, pandas, scikit-learn, joblib, dan MLflow bila diperlukan oleh workflow.

### 3. Jalankan API

Dari root folder proyek:

```powershell
python -m uvicorn src.api:app --reload --host 127.0.0.1 --port 8000
```

Buka alamat berikut di browser:

| Halaman | URL | Kegunaan |
|---|---|---|
| Portal dokumentasi | http://127.0.0.1:8000/docs | Antarmuka dokumentasi utama dan Prediction Studio |
| Swagger UI | http://127.0.0.1:8000/swagger | Mencoba endpoint API secara interaktif |
| Health check | http://127.0.0.1:8000/health | Memeriksa status API |
| Daftar feature | http://127.0.0.1:8000/features | Melihat feature yang dibutuhkan model |
| Contoh input | http://127.0.0.1:8000/example-input | Mengambil contoh input dari dataset |

Jangan menjalankan server lokal dan container Docker secara bersamaan pada port `8000` kecuali salah satunya menggunakan port berbeda.

## Endpoint API

### `GET /health`

Memeriksa apakah layanan API dapat merespons.

Contoh respons:

```json
{
  "status": "healthy",
  "model": "linear_regression_v1",
  "required_features": 31
}
```

Jumlah feature pada respons merupakan contoh format; nilai sebenarnya mengikuti model yang dimuat.

### `GET /features`

Mengembalikan nama feature yang diwajibkan oleh model.

### `GET /example-input`

Mengambil satu baris contoh dari dataset processed dan mengembalikan feature input yang diperlukan model. Endpoint ini seharusnya mengembalikan nilai nyata, bukan template berisi `null`. Jika dataset tidak tersedia atau kolom tidak sesuai, periksa pesan error dan lokasi dataset.

### `POST /predict`

Mengirim feature sebagai JSON untuk memperoleh estimasi prediksi. Gunakan `GET /example-input` sebagai referensi payload agar nama kolom dan tipe data sesuai dengan model yang terpasang.

Contoh alur pengujian:

1. Buka `/example-input`.
2. Salin objek di dalam `features`.
3. Buka `/swagger`.
4. Pilih `POST /predict`, klik **Try it out**, lalu masukkan objek feature tersebut sebagai request body.
5. Klik **Execute** dan periksa respons.

Jangan memasukkan kolom target seperti `total_tasks_completed` atau identifier seperti `employee_id` ke payload kecuali endpoint dan model secara eksplisit memintanya. Gunakan daftar dari `/features` sebagai acuan utama.

## Menjalankan dengan Docker

Jalankan perintah berikut dari root proyek:

```powershell
docker build -t smart-personnel-api:v1 .
docker run -d --name smart-personnel-container -p 8000:8000 smart-personnel-api:v1
```

Periksa container:

```powershell
docker ps
docker logs smart-personnel-container
```

Buka `http://127.0.0.1:8000/docs`.

Jika container dengan nama yang sama sudah ada, hentikan dan hapus container lama sebelum membuat yang baru:

```powershell
docker stop smart-personnel-container
docker rm smart-personnel-container
docker build -t smart-personnel-api:v1 .
docker run -d --name smart-personnel-container -p 8000:8000 smart-personnel-api:v1
```

Pastikan `Dockerfile` menyalin direktori yang dibutuhkan, sekurang-kurangnya `src/`, `models/`, `data/processed/`, `templates/`, dan `static/`. Pastikan juga path pada aplikasi merujuk ke lokasi yang benar di dalam image.

## MLflow experiment tracking

Proyek menggunakan MLflow untuk mencatat eksperimen dan artefak model. Jika MLflow server telah dikonfigurasi pada port `5000`, UI dapat dibuka melalui:

http://127.0.0.1:5000

Contoh menjalankan UI dengan backend SQLite yang digunakan pada pengembangan:

```powershell
mlflow ui --backend-store-uri "sqlite:///C:/MLProjects/smart-personnel-mlops/notebooks/mlflow.db" --host 127.0.0.1 --port 5000
```

Notebook yang mencatat eksperimen melalui tracking server harus menggunakan URI yang sama, misalnya:

```python
import mlflow

mlflow.set_tracking_uri("http://127.0.0.1:5000")
mlflow.set_experiment("smart-personnel-workload")
```

Jalankan perintah dari environment yang telah memasang MLflow. Sesuaikan lokasi database jika file `mlflow.db` berada di direktori lain.

## Evaluasi model

Eksperimen awal membandingkan model baseline, Linear Regression, dan Random Forest. Hasil yang pernah tercatat selama pengembangan:

| Model | MAE | RMSE | R² |
|---|---:|---:|---:|
| Dummy Regressor | 27.60 | 33.97 | -0.0001 |
| Linear Regression | 8.99 | 11.35 | 0.8884 |
| Random Forest | 10.93 | 13.87 | 0.8334 |

Pada evaluasi awal tersebut, Linear Regression memperoleh hasil terbaik di antara model yang dibandingkan. Angka ini adalah hasil eksperimen pada dataset latihan yang digunakan saat itu, bukan jaminan kinerja pada data baru. Jalankan ulang evaluasi jika dataset, fitur, pembagian data, atau versi library berubah.

**Peringatan metodologis:** lakukan audit data leakage sebelum menarik kesimpulan tentang kualitas model. Periksa apakah ada feature yang secara langsung menghitung, merekonstruksi, atau menggunakan informasi target. Evaluasi pada data sintetis tidak membuktikan model akan bekerja sama baiknya pada data pegawai nyata.

## Pengujian

Jika `pytest` telah terpasang dan pengujian berada di folder `tests/`, jalankan dari root proyek:

```powershell
python -m pytest -v
```

Jika menjalankan Python secara eksplisit melalui virtual environment:

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

Pastikan test menggunakan environment yang sama dengan aplikasi. Peringatan perbedaan versi scikit-learn saat memuat model tersimpan sebaiknya diselesaikan dengan menyamakan versi library training dan deployment, lalu menguji ulang model.

## Troubleshooting

### `Model tidak ditemukan`

Pastikan file `models/linear_regression_v1.pkl` ada dan Dockerfile menyalin folder `models/` ke image.

### `/example-input` gagal atau menampilkan `null`

Pastikan `data/processed/employee_workload_feature_engineered.csv` tersedia. Periksa bahwa semua nama feature yang dibutuhkan model ada pada dataset dan endpoint membaca baris data yang benar.

### Prediksi gagal karena feature hilang

Buka `/features` untuk mengetahui nama feature yang diwajibkan model. Gunakan `/example-input` sebagai template payload dan periksa nama serta tipe nilai yang dikirim.

### Portal tidak dapat menghubungi API

Pastikan server aktif, alamat dibuka melalui `http://127.0.0.1:8000`, dan browser tidak membuka HTML dari file lokal (`file://`). Periksa terminal server dan log Docker jika masalah berlanjut.

### Port sudah digunakan

Hentikan proses atau container yang memakai port `8000`, atau jalankan container pada port lain, misalnya `-p 8001:8000`.

### Peringatan versi scikit-learn

Model tersimpan dapat memunculkan `InconsistentVersionWarning` bila versi saat training berbeda dari versi saat model dimuat. Gunakan versi scikit-learn yang konsisten antara training, testing, dan deployment. Jangan mengabaikan warning tersebut untuk penggunaan produksi tanpa pengujian.

## Pengembangan berikutnya

- Menambahkan grafik evaluasi model dan metrik yang diambil dari eksperimen MLflow.
- Menampilkan riwayat prediksi dan perbandingan hasil.
- Memperkuat validasi request dengan schema Pydantic.
- Menambahkan logging, health monitoring, dan pengujian integrasi.
- Menyiapkan CI/CD dan pengelolaan versi model.
- Melakukan audit fairness, privasi, data leakage, dan validasi pada data nyata sebelum penggunaan operasional.

## Lisensi dan penggunaan

Tambahkan informasi lisensi sesuai kebutuhan proyek. Jangan mengunggah data pribadi karyawan, kredensial, file rahasia, atau database eksperimen yang sensitif ke repositori publik.
"""

output_path = "/mnt/data/README.md"
pypandoc.convert_text(
    readme,
    to="md",
    format="md",
    outputfile=output_path,
    extra_args=["--standalone"]
)

print(f"README berhasil dibuat: {output_path}")
