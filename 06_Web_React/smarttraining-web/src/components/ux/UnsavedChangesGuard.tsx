import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SmartConfirmDialog } from "./SmartStates";

type UnsavedChangesGuardProps = {
  when: boolean;
};

export function UnsavedChangesGuard({ when }: UnsavedChangesGuardProps) {
  const navigate = useNavigate();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!when) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const nextHref = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (nextHref === currentHref) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(nextHref);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [when]);

  return (
    <SmartConfirmDialog
      open={Boolean(pendingHref)}
      title="Quitter sans enregistrer ?"
      description="Les modifications non enregistrées seront perdues."
      confirmLabel="Quitter"
      cancelLabel="Rester ici"
      destructive
      onConfirm={() => {
        const nextHref = pendingHref;
        setPendingHref(null);
        if (nextHref) {
          navigate(nextHref);
        }
      }}
      onCancel={() => setPendingHref(null)}
    />
  );
}
