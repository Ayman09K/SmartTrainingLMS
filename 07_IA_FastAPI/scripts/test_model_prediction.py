import json
from pathlib import Path

import joblib
import pandas as pd


CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_IA_DIR = CURRENT_DIR.parent
MODELS_DIR = PROJECT_IA_DIR / "models"
MODEL_PATH = MODELS_DIR / "risk_prediction_pipeline.joblib"
METADATA_PATH = MODELS_DIR / "model_metadata.json"


def load_metadata() -> dict:
    with METADATA_PATH.open("r", encoding="utf-8") as json_file:
        return json.load(json_file)


def build_sample_learner() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "progressPercentage": 25,
                "averageScore": 42,
                "completedLessons": 1,
                "totalLessons": 8,
                "completedQuizzes": 0,
                "totalQuizzes": 3,
                "totalEvents": 2,
                "totalTrainingsStarted": 1,
                "totalTrainingsCompleted": 0,
                "lessonCompletionRate": 0.125,
                "quizCompletionRate": 0.0,
                "scoreRatio": 0.42,
                "daysSinceLastActivity": 28,
                "avgEventsPerTraining": 2.0,
            }
        ]
    )


def main() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Modèle introuvable : {MODEL_PATH}")
    if not METADATA_PATH.exists():
        raise FileNotFoundError(f"Métadonnées introuvables : {METADATA_PATH}")

    metadata = load_metadata()
    model = joblib.load(MODEL_PATH)
    sample_learner = build_sample_learner()[metadata["features"]]

    if list(sample_learner.columns) != metadata["features"]:
        raise ValueError("L'ordre des features ne correspond pas aux métadonnées.")

    prediction = int(model.predict(sample_learner)[0])
    risk_probability = float(model.predict_proba(sample_learner)[0][1])
    risk_label = "AT_RISK" if prediction == 1 else "NOT_AT_RISK"

    print("Projet :", metadata["project"])
    print("Version modèle :", metadata["model_version"])
    print("Nom modèle :", metadata["model_name"])
    print("Target :", metadata["target"])
    print("Type label :", metadata["label_type"])
    print("Nombre de features :", len(metadata["features"]))
    print("prediction :", prediction)
    print("riskLabel :", risk_label)
    print("riskProbability :", round(risk_probability, 4))
    print(
        "interprétation :",
        "Apprenant prédit à risque." if prediction else "Apprenant non prédit à risque.",
    )


if __name__ == "__main__":
    main()
