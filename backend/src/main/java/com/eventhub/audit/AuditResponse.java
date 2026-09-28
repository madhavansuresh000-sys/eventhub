package com.eventhub.audit;

import java.time.LocalDateTime;

public record AuditResponse(
		Long id,
		AuditAction action,
		Long eventId,
		String eventTitle,
		String userName,
		String userEmail,
		String details,
		LocalDateTime createdAt) {

	static AuditResponse from(AuditEntry e) {
		return new AuditResponse(e.getId(), e.getAction(), e.getEventId(), e.getEventTitle(), e.getUserName(),
				e.getUserEmail(), e.getDetails(), e.getCreatedAt());
	}

}
