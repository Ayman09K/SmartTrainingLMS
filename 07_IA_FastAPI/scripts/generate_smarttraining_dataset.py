from pathlib import Path

import numpy as np
import pandas as pd


RANDOM_SEED = 42
N_SAMPLES = 600

PROJECT_IA_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_IA_DIR / "datasets"
OUTPUT_PATH = DATASET_DIR / "smarttraining_ai_dataset.csv"


def safe_ratio(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return round(numerator / denominator, 4)


def generate_dataset() -> pd.DataFrame:
    rng = np.random.default_rng(RANDOM_SEED)
    rows = []

    for index in range(N_SAMPLES):
        learner_id = index + 1
        training_id = int(rng.integers(1, 11))
        total_lessons = int(rng.integers(4, 13))
        total_quizzes = int(rng.integers(1, 5))

        learner_profile = rng.choice(
            ["strong", "medium", "weak"],
            p=[0.32, 0.43, 0.25],
        )

        if learner_profile == "strong":
            progress_percentage = int(rng.integers(65, 101))
            average_score = int(rng.integers(70, 101))
            days_since_last_activity = int(rng.integers(0, 8))
            total_events = int(rng.integers(10, 31))
        elif learner_profile == "medium":
            progress_percentage = int(rng.integers(35, 76))
            average_score = int(rng.integers(50, 81))
            days_since_last_activity = int(rng.integers(3, 18))
            total_events = int(rng.integers(5, 18))
        else:
            progress_percentage = int(rng.integers(0, 46))
            average_score = int(rng.integers(20, 61))
            days_since_last_activity = int(rng.integers(10, 45))
            total_events = int(rng.integers(0, 9))

        completed_lessons = min(
            int(round((progress_percentage / 100) * total_lessons)),
            total_lessons,
        )
        completed_quizzes = min(
            int(round((progress_percentage / 100) * total_quizzes)),
            total_quizzes,
        )
        total_trainings_started = int(rng.integers(1, 5))

        if progress_percentage >= 95 and average_score >= 60:
            total_trainings_completed = int(
                rng.integers(1, total_trainings_started + 1)
            )
        else:
            total_trainings_completed = int(
                rng.integers(0, max(1, total_trainings_started))
            )

        lesson_completion_rate = safe_ratio(completed_lessons, total_lessons)
        quiz_completion_rate = safe_ratio(completed_quizzes, total_quizzes)
        score_ratio = round(average_score / 100, 4)
        avg_events_per_training = round(
            total_events / total_trainings_started,
            4,
        )

        # Weak label provisoire construite sans riskScore, riskLevel ou status.
        at_risk = int(
            (progress_percentage < 35 and average_score < 55)
            or (days_since_last_activity > 21 and progress_percentage < 60)
            or average_score < 45
            or (total_events < 3 and progress_percentage < 45)
        )

        # Bruit contrôlé pour éviter une séparation artificiellement parfaite.
        if rng.random() < 0.06:
            at_risk = 1 - at_risk

        rows.append(
            {
                "learnerId": learner_id,
                "trainingId": training_id,
                "progressPercentage": progress_percentage,
                "averageScore": average_score,
                "completedLessons": completed_lessons,
                "totalLessons": total_lessons,
                "completedQuizzes": completed_quizzes,
                "totalQuizzes": total_quizzes,
                "totalEvents": total_events,
                "totalTrainingsStarted": total_trainings_started,
                "totalTrainingsCompleted": total_trainings_completed,
                "lessonCompletionRate": lesson_completion_rate,
                "quizCompletionRate": quiz_completion_rate,
                "scoreRatio": score_ratio,
                "daysSinceLastActivity": days_since_last_activity,
                "avgEventsPerTraining": avg_events_per_training,
                "at_risk": at_risk,
            }
        )

    return pd.DataFrame(rows)


def main() -> None:
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    dataset = generate_dataset()
    dataset.to_csv(OUTPUT_PATH, index=False, encoding="utf-8")

    print("Dataset IA SmartTraining généré avec succès.")
    print(f"Chemin : {OUTPUT_PATH}")
    print(f"Dimensions : {dataset.shape[0]} lignes x {dataset.shape[1]} colonnes")
    print("\nRépartition de la cible at_risk :")
    print(dataset["at_risk"].value_counts().sort_index())
    print("\nRépartition en pourcentage :")
    print((dataset["at_risk"].value_counts(normalize=True).sort_index() * 100).round(2))
    print("\nAperçu des 5 premières lignes :")
    print(dataset.head())


if __name__ == "__main__":
    main()
