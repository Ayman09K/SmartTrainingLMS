import "./Feedback.css";
export function LoadingState({ message = "Chargement..." }: { message?: string }) {
  return <div className="feedback-card"><div className="loader" /><p>{message}</p></div>;
}
