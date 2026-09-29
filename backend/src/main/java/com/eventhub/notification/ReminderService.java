package com.eventhub.notification;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.eventhub.booking.Booking;
import com.eventhub.booking.BookingRepository;
import com.eventhub.booking.BookingStatus;

/**
 * The day-before reminder: "Tomorrow: Tech Fest 2026, 10:00 AM, Main Auditorium".
 * Run by ReminderJob every evening (cron). Each booking gets ONE reminder (bookings.reminder_sent_at),
 * even if the job runs twice.
 */
@Service
public class ReminderService {

	private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

	private final BookingRepository bookings;

	private final NotificationTriggers triggers;

	private final TransactionTemplate tx;

	public ReminderService(BookingRepository bookings, NotificationTriggers triggers, PlatformTransactionManager txManager) {
		this.bookings = bookings;
		this.triggers = triggers;
		this.tx = new TransactionTemplate(txManager);
	}

	/** Reminds everyone with a confirmed booking for an event that starts on the day after `today`. */
	public int remindForDayAfter(LocalDate today) {
		LocalDateTime from = today.plusDays(1).atStartOfDay();
		LocalDateTime to = today.plusDays(2).atStartOfDay();
		int sent = 0;
		for (Long id : bookings.findIdsNeedingReminder(from, to)) {
			// one small transaction per booking: the reminder row and "reminder sent" are saved together
			Boolean done = tx.execute(s -> {
				Booking b = bookings.findWithEventById(id).orElse(null);
				if (b == null || b.getStatus() != BookingStatus.CONFIRMED || b.getReminderSentAt() != null) {
					return false;
				}
				triggers.reminder(b);
				b.setReminderSentAt(LocalDateTime.now());
				return true;
			});
			if (Boolean.TRUE.equals(done)) {
				sent++;
			}
		}
		if (sent > 0) {
			log.info("Sent {} reminder(s) for events starting on {}", sent, from.toLocalDate());
		}
		return sent;
	}

}
