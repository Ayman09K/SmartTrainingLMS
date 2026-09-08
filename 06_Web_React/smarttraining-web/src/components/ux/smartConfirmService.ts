export type SmartConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export type SmartConfirmRequest = {
  options: SmartConfirmOptions;
  resolve: (confirmed: boolean) => void;
};

type SmartConfirmDispatch = (request: SmartConfirmRequest) => void;

let hostDispatch: SmartConfirmDispatch | null = null;
let activeRequest = false;

export function smartConfirm(
  options: SmartConfirmOptions,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (!hostDispatch || activeRequest) {
      resolve(false);
      return;
    }

    activeRequest = true;
    hostDispatch({ options, resolve });
  });
}

export function registerSmartConfirmHost(
  dispatch: SmartConfirmDispatch,
): () => void {
  hostDispatch = dispatch;

  return () => {
    if (hostDispatch === dispatch) {
      hostDispatch = null;
    }
    activeRequest = false;
  };
}

export function releaseSmartConfirmRequest(): void {
  activeRequest = false;
}
