package com.eventhub.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import com.eventhub.user.UserRepository;

/** Phase 9: a demo server without a mail account (MAIL_ENABLED=false) keeps the bell but sends no emails. */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

	@Mock
	private NotificationRepository notifications;

	@Mock
	private UserRepository users;

	@Mock
	private ApplicationEventPublisher publisher;

	@InjectMocks
	private NotificationService service;

	@Test
	void withMailOnTheEmailIsQueued() {
		ReflectionTestUtils.setField(service, "mailEnabled", true);
		Notification n = service.create(5L, NotificationKind.BOOKING_CONFIRMED, "Booking confirmed", "See you there", "/my-tickets", true);
		assertThat(n.getEmailStatus()).isEqualTo(EmailStatus.PENDING);
		verify(publisher).publishEvent(any(NotificationService.EmailQueued.class));
	}

	@Test
	void withMailOffOnlyTheBellShowsIt() {
		ReflectionTestUtils.setField(service, "mailEnabled", false);
		Notification n = service.create(5L, NotificationKind.BOOKING_CONFIRMED, "Booking confirmed", "See you there", "/my-tickets", true);
		assertThat(n.getEmailStatus()).isEqualTo(EmailStatus.NONE);
		verify(notifications).save(n);          // still in the bell
		verify(publisher, never()).publishEvent(any(Object.class));
	}

}
