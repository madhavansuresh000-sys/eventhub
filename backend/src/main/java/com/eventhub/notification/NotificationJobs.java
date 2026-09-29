package com.eventhub.notification;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * The two timed jobs of notifications. Switched off in tests (app.scheduling.enabled=false).
 *
 *   reminders   cron "0 0 18 * * *" = every day at 18:00 (6 PM India time): events of tomorrow
 *               (cron fields: second minute hour day-of-month month day-of-week)
 *   emailRetry  every minute: emails that could not be sent yet (mail server was down)
 */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class NotificationJobs {

	private final ReminderService reminders;

	private final EmailSender emails;

	@Scheduled(cron = "${app.reminders.cron}", zone = "${app.reminders.zone}")
	public void reminders() {
		reminders.remindForDayAfter(LocalDate.now());
	}

	@Scheduled(fixedDelayString = "${app.mail.retry-every}", initialDelayString = "${app.mail.retry-every}")
	public void emailRetry() {
		emails.sendPending(LocalDateTime.now().minusMinutes(1));
	}

}
