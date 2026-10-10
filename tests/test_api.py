
from fastapi.testclient import TestClient

from src.api import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200

    result = response.json()
    assert result["status"] == "healthy"
    assert result["model"] == "linear_regression_v1"


def test_features_endpoint():
    response = client.get("/features")

    assert response.status_code == 200

    result = response.json()
    assert result["total_features"] == 31
    assert len(result["features"]) == 31


def test_example_input_endpoint():
    response = client.get("/example-input")

    assert response.status_code == 200

    result = response.json()
    assert "features" in result
    assert len(result["features"]) == 31


def test_predict_rejects_missing_features():
    response = client.post(
        "/predict",
        json={
            "department": "Umum"
        }
    )

    assert response.status_code == 422


def test_predict_with_sample_data():
    sample = {
        "department": "Umum",
        "division": "Logistik",
        "position_level": "Supervisor",
        "employment_type": "Tetap",
        "years_experience": 2.3,
        "age": 31,
        "working_days": 20,
        "working_hours": 158.6,
        "overtime_hours": 55.0,
        "incoming_documents": 106,
        "processed_documents": 106,
        "pending_documents": 0,
        "service_requests": 76,
        "completed_requests": 73,
        "data_entry_tasks": 88,
        "verification_tasks": 34,
        "report_tasks": 11,
        "meeting_hours": 13.3,
        "training_hours": 0.3,
        "leave_days": 1,
        "average_processing_time": 36.7,
        "error_count": 7,
        "customer_complaints": 1.0,
        "system_usage_hours": 94.5,
        "automation_level": 0.252,
        "remote_work_days": 0,
        "task_complexity": 0.839,
        "productivity_score": 0.663,
        "document_completion_rate": 1.0,
        "pending_document_ratio": 0.0,
        "experience_category": "Menengah"
    }

    response = client.post("/predict", json=sample)

    assert response.status_code == 200

    result = response.json()
    assert result["success"] is True
    assert result["model"] == "linear_regression_v1"
    assert isinstance(result["prediction"], (int, float))
