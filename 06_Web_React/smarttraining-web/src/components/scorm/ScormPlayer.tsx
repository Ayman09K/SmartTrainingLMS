import { useEffect, useRef, useState } from "react";
import {
  buildScormRuntimeUrl,
  getMyScormAttemptState,
  launchScorm,
} from "../../api/scormRuntimeApi";

interface ScormPlayerProps {
  resourceId: number;
  title?: string;
  onTerminal?: () => void;
}

const TERMINAL_STATUSES = new Set([
  "PASSED",
  "FAILED",
  "COMPLETED",
]);

export default function ScormPlayer({
  resourceId,
  title = "Formation SCORM",
  onTerminal,
}: ScormPlayerProps) {
  const [runtimeUrl, setRuntimeUrl] = useState("");
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const terminalNotifiedRef = useRef(false);
  const launchPromiseRef = useRef<{
    resourceId: number;
    promise: ReturnType<typeof launchScorm>;
  } | null>(null);

  useEffect(() => {
    let active = true;

    setRuntimeUrl("");
    setAttemptId(null);
    setError("");
    terminalNotifiedRef.current = false;

    const launchPromise =
      launchPromiseRef.current?.resourceId === resourceId
        ? launchPromiseRef.current.promise
        : launchScorm(resourceId);

    launchPromiseRef.current = {
      resourceId,
      promise: launchPromise,
    };

    void launchPromise
      .then((launch) => {
        if (active) {
          setError("");
          setAttemptId(launch.attemptId);
          setRuntimeUrl(buildScormRuntimeUrl(launch.runtimePath));
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible de lancer le contenu SCORM.");
        }
      });

    return () => {
      active = false;
    };
  }, [resourceId]);

  useEffect(() => {
    if (!attemptId) return;

    const currentAttemptId = attemptId;
    let active = true;
    let inFlight = false;

    async function refreshAttemptState() {
      if (!active || inFlight || terminalNotifiedRef.current) {
        return;
      }

      inFlight = true;

      try {
        const state = await getMyScormAttemptState(currentAttemptId);
        const normalizedStatus = String(state.status || "").toUpperCase();

        if (
          active
          && TERMINAL_STATUSES.has(normalizedStatus)
          && !terminalNotifiedRef.current
        ) {
          terminalNotifiedRef.current = true;
          onTerminal?.();
        }
      } catch {
        // Le runtime iframe reste la source de vérité.
        // Une erreur transitoire de polling ne doit pas interrompre le SCO.
      } finally {
        inFlight = false;
      }
    }

    void refreshAttemptState();

    const timer = window.setInterval(() => {
      void refreshAttemptState();
    }, 1500);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [attemptId, onTerminal]);

  if (error && !runtimeUrl) {
    return <div role="alert">{error}</div>;
  }

  if (!runtimeUrl) {
    return <div>Chargement du contenu SCORM...</div>;
  }

  return (
    <iframe
      title={title}
      src={runtimeUrl}
      style={{
        width: "100%",
        minHeight: "75vh",
        border: 0,
        borderRadius: 12,
        background: "#fff",
      }}
      allow="fullscreen"
      referrerPolicy="no-referrer"
    />
  );
}
