package com.smarttraining.auth.event;

import com.smarttraining.auth.enums.AccountDeletionRequestStatus;

public record AccountDeletionNotificationEvent(
        Long requestId,
        Long userId,
        String roleSnapshot,
        AccountDeletionRequestStatus status,
        boolean notifyAdmins
) {
}
