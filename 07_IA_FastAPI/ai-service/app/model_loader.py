import json
import os
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


CURRENT_FILE = Path(__file__).resolve()
AI_SERVICE_DIR = CURRENT_FILE.parent.parent
IA_ROOT_DIR = AI_SERVICE_DIR.parent
MODEL_DIR = Path(os.getenv("MODEL_DIR", str(IA_ROOT_DIR / "models")))
MODEL_PATH = MODEL_DIR / "risk_prediction_pipeline.joblib"
METADATA_PATH = MODEL_DIR / "model_metadata.json"


class ModelLoader:
    def __init__(self) -> None:
        self.model: Any | None = None
        self.metadata: dict[str, Any] | None = None

    def load(self) -> None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Modèle introuvable : {MODEL_PATH}")
        if not METADATA_PATH.exists():
            raise FileNotFoundError(f"Métadonnées introuvables : {METADATA_PATH}")

        self.model = joblib.load(MODEL_PATH)
        with METADATA_PATH.open("r", encoding="utf-8") as json_file:
            self.metadata = json.load(json_file)

        if not self.metadata.get("features"):
            raise ValueError("La liste des features est absente des métadonnées.")

    def is_loaded(self) -> bool:
        return self.model is not None and self.metadata is not None

    def _require_loaded(self) -> tuple[Any, dict[str, Any]]:
        if not self.is_loaded():
            raise RuntimeError("Le modèle IA n'est pas chargé.")
        return self.model, self.metadata  # type: ignore[return-value]

    def get_model_info(self) -> dict[str, Any]:
        _, metadata = self._require_loaded()
        return {
            "project": metadata.get("project"),
            "modelVersion": metadata.get("model_version"),
            "modelName": metadata.get("model_name"),
            "problemType": metadata.get("problem_type"),
            "target": metadata.get("target"),
            "labelType": metadata.get("label_type"),
            "features": metadata.get("features"),
            "excludedColumns": metadata.get(
                "excluded_columns_to_avoid_target_leakage"
            ),
            "trainingMethod": metadata.get("training_method"),
            "bestParams": metadata.get("best_params"),
            "bestCvF1": metadata.get("best_cv_f1"),
            "testMetrics": metadata.get("test_metrics"),
        }

    def predict(self, request_data: dict[str, Any]) -> dict[str, Any]:
        model, metadata = self._require_loaded()

        if self._is_data_insufficient(request_data):
            return {
                "prediction": 0,
                "riskLabel": "DATA_INSUFFICIENT",
                "riskProbability": 0.0,
                "riskLevel": "DATA_INSUFFICIENT",
                "dataStatus": "INSUFFICIENT",
                "modelName": "rule-based-guard",
                "modelVersion": "1.0",
                "explanation": (
                    "Données insuffisantes : le service IA ne classe pas "
                    "l'apprenant à risque sans activité exploitable."
                ),
            }

        features = metadata["features"]
        dataframe = pd.DataFrame([request_data])[features]

        prediction = int(model.predict(dataframe)[0])
        risk_probability = float(model.predict_proba(dataframe)[0][1])

        if risk_probability >= 0.70:
            risk_level = "HIGH"
        elif risk_probability >= 0.40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        if prediction == 1:
            risk_label = "AT_RISK"
            explanation = (
                "Le modèle prédit que l'apprenant présente un risque pédagogique."
            )
        else:
            risk_label = "NOT_AT_RISK"
            explanation = (
                "Le modèle ne prédit pas de risque pédagogique majeur pour cet apprenant."
            )

        return {
            "prediction": prediction,
            "riskLabel": risk_label,
            "riskProbability": round(risk_probability, 4),
            "riskLevel": risk_level,
            "dataStatus": "SUFFICIENT",
            "modelName": metadata.get("model_name", "Unknown"),
            "modelVersion": metadata.get("model_version", "Unknown"),
            "explanation": explanation,
        }

    def _is_data_insufficient(self, request_data: dict[str, Any]) -> bool:
        progress_percentage = float(request_data.get("progressPercentage") or 0)
        average_score = float(request_data.get("averageScore") or 0)
        completed_lessons = int(request_data.get("completedLessons") or 0)
        completed_quizzes = int(request_data.get("completedQuizzes") or 0)
        total_events = int(request_data.get("totalEvents") or 0)
        total_trainings_started = int(request_data.get("totalTrainingsStarted") or 0)
        total_trainings_completed = int(request_data.get("totalTrainingsCompleted") or 0)
        lesson_completion_rate = float(request_data.get("lessonCompletionRate") or 0)
        quiz_completion_rate = float(request_data.get("quizCompletionRate") or 0)
        score_ratio = float(request_data.get("scoreRatio") or 0)
        avg_events_per_training = float(request_data.get("avgEventsPerTraining") or 0)

        return (
            progress_percentage == 0
            and average_score == 0
            and completed_lessons == 0
            and completed_quizzes == 0
            and total_events == 0
            and total_trainings_started == 0
            and total_trainings_completed == 0
            and lesson_completion_rate == 0
            and quiz_completion_rate == 0
            and score_ratio == 0
            and avg_events_per_training == 0
        )


model_loader = ModelLoader()
