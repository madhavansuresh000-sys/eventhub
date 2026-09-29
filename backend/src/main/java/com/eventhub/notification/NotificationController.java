package com.eventhub.notification;

import java.time.LocalDate;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.auth.CurrentUser;
import com.eventhub.notification.dto.NotificationResponse;
import com.eventhub.notification.dto.NotificationsResponse;

import lombok.RequiredArgsConstructor;

/** The bell. Login required; only your own notifications. */
@RestController
@RequiredArgsConstructor
public class NotificationController {

	private final NotificationService service;

	private final ReminderService reminders;

	@GetMapping("/api/notifications")
	public NotificationsResponse mine(@AuthenticationPrincipal CurrentUser user) {
		return service.mine(user.id());
	}

	@PostMapping("/api/notifications/{id}/read")
	public NotificationResponse read(@AuthenticationPrincipal CurrentUser user, @PathVariable Long id) {
		return service.markRead(user.id(), id);
	}

	@PostMapping("/api/notifications/read-all")
	public Map<String, Integer> readAll(@AuthenticationPrincipal CurrentUser user) {
		return Map.of("marked", service.markAllRead(user.id()));
	}

	/** Admin only (/api/admin/**): run the 6 PM reminder job now - handy for a demo. */
	@PostMapping("/api/admin/reminders/run")
	public Map<String, Integer> runReminders() {
		return Map.of("sent", reminders.remindForDayAfter(LocalDate.now()));
	}

}
