package com.eventhub.notification.dto;

import java.time.LocalDateTime;

import com.eventhub.notification.Notification;
import com.eventhub.notification.NotificationKind;

public record NotificationResponse(
		Long id,
		NotificationKind kind,
		String title,
		String body,
		String link,
		LocalDateTime createdAt,
		boolean read) {

	public static NotificationResponse from(Notification n) {
		return new NotificationResponse(n.getId(), n.getKind(), n.getTitle(), n.getBody(), n.getLink(), n.getCreatedAt(),
				n.getReadAt() != null);
	}

}
