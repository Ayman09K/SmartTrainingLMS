import { useEffect, useRef, useState } from "react";
import { SmartConfirmDialog } from "./SmartStates";
import {
  registerSmartConfirmHost,
  releaseSmartConfirmRequest,
  type SmartConfirmRequest,
} from "./smartConfirmService";

export function SmartConfirmHost() {
  const [request, setRequest] = useState<SmartConfirmRequest | null>(null);
  const requestRef = useRef<SmartConfirmRequest | null>(null);

  useEffect(() => {
    const unregister = registerSmartConfirmHost((nextRequest) => {
      requestRef.current = nextRequest;
      setRequest(nextRequest);
    });

    return () => {
      unregister();
      requestRef.current?.resolve(false);
      requestRef.current = null;
    };
  }, []);

  function settle(confirmed: boolean) {
    const current = requestRef.current;
    if (!current) {
      return;
    }

    requestRef.current = null;
    setRequest(null);
    releaseSmartConfirmRequest();
    current.resolve(confirmed);
  }

  return (
    <SmartConfirmDialog
      open={Boolean(request)}
      title={request?.options.title ?? "Confirmer l’action"}
      description={request?.options.description ?? ""}
      confirmLabel={request?.options.confirmLabel}
      cancelLabel={request?.options.cancelLabel}
      destructive={request?.options.destructive}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );
}
