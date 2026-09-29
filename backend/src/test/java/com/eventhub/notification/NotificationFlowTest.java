package com.eventhub.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.auth.TestAccounts;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.user.User;
import com.jayway.jsonpath.JsonPath;

/**
 * Phase 7 step 2: bell + emails.
 * The mail server is replaced by a Mockito "fake" (@MockitoBean), so we can see exactly which emails
 * would go out - and make it fail on purpose. Tests are @Transactional (rolled back), so the
 * after-commit send never happens here; the tests call EmailSender.sendPending() themselves.
 */
@SpringBootTest(properties = "management.health.mail.enabled=false") // the mail health check needs a real mail sender
@AutoConfigureMockMvc
@Transactional
class NotificationFlowTest {

	private static final long ARDUINO = 16; // ₹150, 5 seats left

	private static final long GIT_WORKSHOP = 3; // free

	private static final long STREET_PLAY = 9; // club 2, PENDING_APPROVAL

	@MockitoBean
	private JavaMailSender mail;

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	@Autowired
	private EmailSender emails;

	@Autowired
	private ReminderService reminders;

	@Autowired
	private NotificationRepository notifications;

	@Autowired
	private EventRepository events;

	private ResultActions book(User user, long eventId, int quantity) throws Exception {
		return mvc.perform(post("/api/bookings").with(accounts.as(user)).contentType(MediaType.APPLICATION_JSON)
			.content("{\"eventId\": %d, \"quantity\": %d}".formatted(eventId, quantity)));
	}

	private long idOf(ResultActions result) throws Exception {
		return ((Number) JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.id")).longValue();
	}

	private ResultActions bell(User user) throws Exception {
		return mvc.perform(get("/api/notifications").with(accounts.as(user)));
	}

	private int sendEmailsNow() {
		return emails.sendPending(LocalDateTime.now().plusMinutes(1));
	}

	@Test
	void cancellingSendsAnOfferEmailToTheFirstWaitlistedStudent() throws Exception {
		User asha = accounts.student();
		long ashaBooking = idOf(book(asha, ARDUINO, 5)); // sold out
		User bala = accounts.student();
		mvc.perform(post("/api/waitlist").with(accounts.as(bala)).contentType(MediaType.APPLICATION_JSON)
			.content("{\"eventId\": 16, \"quantity\": 2}")).andExpect(status().isCreated());

		mvc.perform(post("/api/bookings/" + ashaBooking + "/cancel").with(accounts.as(asha))).andExpect(status().isOk());

		bell(bala).andExpect(jsonPath("$.unread").value(1))
			.andExpect(jsonPath("$.items[0].kind").value("SEAT_OFFERED"))
			.andExpect(jsonPath("$.items[0].title").value("Seats free for Arduino Basics Workshop - kept for you"))
			.andExpect(jsonPath("$.items[0].link").value("/waitlist"));

		assertThat(sendEmailsNow()).isEqualTo(1);
		ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
		verify(mail).send(sent.capture());
		assertThat(sent.getValue().getTo()).containsExactly(bala.getEmail());
		assertThat(sent.getValue().getSubject()).contains("Arduino Basics Workshop");
		assertThat(sent.getValue().getText()).contains("2 seats").contains("http://localhost:5173/waitlist");

		assertThat(sendEmailsNow()).isZero(); // already SENT: never emailed twice
		verify(mail, times(1)).send(any(SimpleMailMessage.class));
	}

	@Test
	void aConfirmedBookingRingsTheBellAndCanBeMarkedRead() throws Exception {
		User ravi = accounts.student();
		book(ravi, GIT_WORKSHOP, 1).andExpect(jsonPath("$.status").value("CONFIRMED"));

		String json = bell(ravi).andExpect(jsonPath("$.unread").value(1))
			.andExpect(jsonPath("$.items[0].kind").value("BOOKING_CONFIRMED"))
			.andExpect(jsonPath("$.items[0].read").value(false))
			.andReturn().getResponse().getContentAsString();
		long id = ((Number) JsonPath.read(json, "$.items[0].id")).longValue();

		mvc.perform(post("/api/notifications/" + id + "/read").with(accounts.as(accounts.student())))
			.andExpect(status().isNotFound()); // not yours
		mvc.perform(post("/api/notifications/" + id + "/read").with(accounts.as(ravi)))
			.andExpect(status().isOk()).andExpect(jsonPath("$.read").value(true));
		bell(ravi).andExpect(jsonPath("$.unread").value(0));
	}

	@Test
	void whenTheMailServerIsDownTheEmailIsRetriedThenGivenUp() throws Exception {
		doThrow(new MailSendException("Mailpit is not running")).when(mail).send(any(SimpleMailMessage.class));
		User ravi = accounts.student();
		book(ravi, GIT_WORKSHOP, 1);

		for (int i = 1; i <= EmailSender.MAX_ATTEMPTS; i++) {
			assertThat(sendEmailsNow()).isZero();
		}
		Notification n = notifications.findAll().stream()
			.filter(x -> x.getUser().getId().equals(ravi.getId())).findFirst().orElseThrow();
		assertThat(n.getEmailAttempts()).isEqualTo(EmailSender.MAX_ATTEMPTS);
		assertThat(n.getEmailStatus()).isEqualTo(EmailStatus.FAILED);
		sendEmailsNow(); // FAILED ones are not tried again
		verify(mail, times(EmailSender.MAX_ATTEMPTS)).send(any(SimpleMailMessage.class));
		bell(ravi).andExpect(jsonPath("$.unread").value(1)); // the bell still has it
	}

	@Test
	void theDayBeforeReminderIsSentOncePerBooking() throws Exception {
		Event git = events.findById(GIT_WORKSHOP).orElseThrow();
		LocalDate today = LocalDate.now();
		git.setStartTime(today.plusDays(1).atTime(14, 0));
		git.setEndTime(today.plusDays(1).atTime(17, 0));
		events.saveAndFlush(git);
		User ravi = accounts.student();
		book(ravi, GIT_WORKSHOP, 1);

		assertThat(reminders.remindForDayAfter(today)).isEqualTo(1);
		assertThat(reminders.remindForDayAfter(today)).isZero(); // job runs again: no second reminder
		bell(ravi).andExpect(jsonPath("$.unread").value(2))
			.andExpect(jsonPath("$.items[?(@.kind == 'EVENT_REMINDER')].title").value("Tomorrow: Intro to Git and GitHub"));
		verify(mail, never()).send(any(SimpleMailMessage.class)); // sent after commit / by the job, not inside
	}

	@Test
	void organizersHearTheAdminsDecision() throws Exception {
		User kavya = accounts.organizerOf(2L);
		User otherClub = accounts.organizerOf(1L);
		mvc.perform(post("/api/events/" + STREET_PLAY + "/reject").with(accounts.as(accounts.admin()))
				.contentType(MediaType.APPLICATION_JSON).content("{\"reason\": \"Please add the route of the plays\"}"))
			.andExpect(status().isOk());

		bell(kavya).andExpect(jsonPath("$.unread").value(1))
			.andExpect(jsonPath("$.items[0].kind").value("EVENT_SENT_BACK"))
			.andExpect(jsonPath("$.items[0].link").value("/organizer"));
		bell(otherClub).andExpect(jsonPath("$.unread").value(0));

		mvc.perform(post("/api/notifications/read-all").with(accounts.as(kavya))).andExpect(jsonPath("$.marked").value(1));
		bell(kavya).andExpect(jsonPath("$.unread").value(0));
	}

	@Test
	void theBellNeedsALoginAndRemindersNeedAnAdmin() throws Exception {
		mvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
		mvc.perform(post("/api/admin/reminders/run").with(accounts.as(accounts.student()))).andExpect(status().isForbidden());
		mvc.perform(post("/api/admin/reminders/run").with(accounts.as(accounts.admin()))).andExpect(status().isOk());
	}

}
