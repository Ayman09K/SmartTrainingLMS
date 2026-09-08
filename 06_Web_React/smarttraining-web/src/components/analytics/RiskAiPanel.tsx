import type {
  AiRiskPredictionResponse,
  RiskIndicatorResponse,
  RiskLevel,
} from "../../types/analytics";
import "./Analytics.css";

function badgeClass(level?: RiskLevel) {
  if (level === "HIGH") return "risk-high";
  if (level === "MEDIUM") return "risk-medium";
  return "risk-low";
}

function levelLabel(level?: RiskLevel) {
  if (level === "DATA_INSUFFICIENT") return "Données insuffisantes";
  if (level === "HIGH") return "Accompagnement prioritaire";
  if (level === "MEDIUM") return "Accompagnement à renforcer";
  return "Accompagnement léger";
}

function explanation(level?: RiskLevel) {
  if (level === "DATA_INSUFFICIENT") {
    return "Il n’y a pas encore assez d’activité pour évaluer votre besoin d’accompagnement. L’indicateur s’ajustera au fur et à mesure de votre progression.";
  }
  if (level === "HIGH") {
    return "Votre parcours montre plusieurs signaux qui justifient un accompagnement rapproché. Votre formateur peut vous aider à reprendre les activités prioritaires.";
  }
  if (level === "MEDIUM") {
    return "Votre progression mérite une attention particulière. Avancez régulièrement et sollicitez votre formateur lorsque vous rencontrez une difficulté.";
  }
  return "Votre parcours ne montre pas actuellement de difficulté importante. Continuez à avancer régulièrement.";
}

export function RiskAiPanel({
  risk,
  aiPrediction,
}: {
  risk: RiskIndicatorResponse | null;
  aiPrediction: AiRiskPredictionResponse | null;
}) {
  const level = aiPrediction?.riskLevel || risk?.riskLevel;
  const insufficient = level === "DATA_INSUFFICIENT";

  const nextAction = insufficient
    ? "Commencez ou poursuivez les premières activités de votre formation pour obtenir ensuite un indicateur personnalisé."
    : risk?.recommendation ||
      risk?.recommendations?.[0] ||
      "Poursuivez les activités prévues et demandez de l’aide à votre formateur si nécessaire.";

  return (
    <div className="risk-ai-grid">
      <section className="risk-card">
        <div className="risk-header">
          <h2 className="risk-title">Niveau d’accompagnement recommandé</h2>
          <span className={`risk-badge ${badgeClass(level)}`}>
            {levelLabel(level)}
          </span>
        </div>
        <p className="risk-text">{explanation(level)}</p>
      </section>

      <section className="risk-card">
        <div className="risk-header">
          <h2 className="risk-title">Prochaine action conseillée</h2>
        </div>
        <p className="risk-text">{nextAction}</p>
      </section>
    </div>
  );
}