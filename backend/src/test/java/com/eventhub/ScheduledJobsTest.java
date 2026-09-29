package com.eventhub;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.eventhub.booking.BookingService;
import com.eventhub.booking.HoldExpiryJob;
import com.eventhub.notification.EmailSender;
import com.eventhub.notification.NotificationJobs;
import com.eventhub.notification.ReminderService;
import com.eventhub.waitlist.WaitlistOfferJob;
import com.eventhub.waitlist.WaitlistService;

/**
 * Phase 8 step 1: the timer jobs are switched off in the other tests (app.scheduling.enabled=false),
 * so here we check, with Mockito, that each job calls the right service - and with the right time.
 */
class ScheduledJobsTest {

	@Test
	void holdExpiryJobFreesOldHolds() {
		BookingService bookings = mock(BookingService.class);
		new HoldExpiryJob(bookings).run();
		verify(bookings).expireOldHolds();
	}

	@Test
	void waitlistJobPassesUnansweredOffersOn() {
		WaitlistService waitlist = mock(WaitlistService.class);
		new WaitlistOfferJob(waitlist).run();
		verify(waitlist).expireOldOffers();
	}

	@Test
	void reminderJobRemindsForTomorrowsEventsCountedFromToday() {
		ReminderService reminders = mock(ReminderService.class);
		new NotificationJobs(reminders, mock(EmailSender.class)).reminders();
		verify(reminders).remindForDayAfter(LocalDate.now());
	}

	@Test
	void emailRetryJobOnlyTakesEmailsOlderThanOneMinute() {
		EmailSender emails = mock(EmailSender.class);
		LocalDateTime before = LocalDateTime.now().minusMinutes(1);

		new NotificationJobs(mock(ReminderService.class), emails).emailRetry();

		// brand-new emails are still being sent right after their commit; the retry job leaves them alone
		ArgumentCaptor<LocalDateTime> olderThan = ArgumentCaptor.forClass(LocalDateTime.class);
		verify(emails).sendPending(olderThan.capture());
		assertThat(olderThan.getValue()).isBetween(before, LocalDateTime.now().minusMinutes(1));
	}

}
