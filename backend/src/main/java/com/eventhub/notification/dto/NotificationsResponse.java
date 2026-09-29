package com.eventhub.notification.dto;

import java.util.List;

/** What the bell needs: the red number + the newest messages. */
public record NotificationsResponse(long unread, List<NotificationResponse> items) {
}
