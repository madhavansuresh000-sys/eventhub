package com.eventhub.gate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.auth.TestAccounts;
import com.eventhub.user.User;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.jayway.jsonpath.JsonPath;

/**
 * Phase 7 steps 3-4: QR tickets and the gate.
 * Event 3 = Intro to Git (free, Coding Club = club 1), 14 = Yoga Morning (free, Sports Club = club 3),
 * 1 = Tech Fest (₹100, club 1).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GateFlowTest {

	private static final long GIT = 3;

	private static final long YOGA = 14;

	private static final long TECH_FEST = 1;

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	private String book(User user, long eventId, int quantity) throws Exception {
		return mvc.perform(post("/api/bookings").with(accounts.as(user)).contentType(MediaType.APPLICATION_JSON)
				.content("{\"eventId\": %d, \"quantity\": %d}".formatted(eventId, quantity)))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
	}

	private ResultActions scan(User scanner, long eventId, String code) throws Exception {
		return mvc.perform(post("/api/gate/events/" + eventId + "/check-in").with(accounts.as(scanner))
			.contentType(MediaType.APPLICATION_JSON).content("{\"code\": \"%s\"}".formatted(code)));
	}

	@Test
	void theTicketQrPictureHoldsTheTicketCodeAndOnlyTheOwnerGetsIt() throws Exception {
		User ravi = accounts.student();
		String json = book(ravi, GIT, 1);
		long id = ((Number) JsonPath.read(json, "$.id")).longValue();
		String code = JsonPath.read(json, "$.ticketCode");

		byte[] png = mvc.perform(get("/api/bookings/" + id + "/qr.png").with(accounts.as(ravi)))
			.andExpect(status().isOk())
			.andExpect(content().contentType(MediaType.IMAGE_PNG))
			.andReturn().getResponse().getContentAsByteArray();

		// read the picture back like a phone camera would
		var image = ImageIO.read(new ByteArrayInputStream(png));
		var bitmap = new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(image)));
		assertThat(new MultiFormatReader().decode(bitmap).getText()).isEqualTo(code);

		mvc.perform(get("/api/bookings/" + id + "/qr.png").with(accounts.as(accounts.student())))
			.andExpect(status().isNotFound());
	}

	@Test
	void scanningTheSameTicketTwiceShowsAlreadyUsed() throws Exception {
		User ravi = accounts.student();
		String code = JsonPath.read(book(ravi, GIT, 2), "$.ticketCode");
		User priya = accounts.volunteerOf(1L);

		scan(priya, GIT, code.toLowerCase() + "  ") // typed by hand: spaces and small letters are fine
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.result").value("VALID"))
			.andExpect(jsonPath("$.message").value("Let in 2 people."))
			.andExpect(jsonPath("$.holder").value(ravi.getFullName()))
			.andExpect(jsonPath("$.stats.checkedInPeople").value(2));

		scan(priya, GIT, code)
			.andExpect(jsonPath("$.result").value("ALREADY_USED"))
			.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.endsWith(" by " + priya.getFullName() + ".")))
			.andExpect(jsonPath("$.stats.checkedInPeople").value(2)); // not counted twice

		// the student sees it on the ticket, and cannot cancel a used ticket
		String booking = mvc.perform(get("/api/bookings/mine").with(accounts.as(ravi)))
			.andExpect(jsonPath("$[0].checkedInAt").isNotEmpty())
			.andExpect(jsonPath("$[0].canCancel").value(false))
			.andReturn().getResponse().getContentAsString();
		long id = ((Number) JsonPath.read(booking, "$[0].id")).longValue();
		mvc.perform(post("/api/bookings/" + id + "/cancel").with(accounts.as(ravi))).andExpect(status().isConflict());
	}

	@Test
	void fakeWrongEventCancelledAndUnpaidTicketsAreInvalid() throws Exception {
		User volunteer = accounts.volunteerOf(1L);
		scan(volunteer, GIT, "EVH-FAKE1-23456")
			.andExpect(jsonPath("$.result").value("INVALID"))
			.andExpect(jsonPath("$.holder").doesNotExist());

		String yoga = JsonPath.read(book(accounts.student(), YOGA, 1), "$.ticketCode");
		scan(volunteer, GIT, yoga).andExpect(jsonPath("$.result").value("INVALID"))
			.andExpect(jsonPath("$.message").value("This ticket is for Yoga Morning, not Intro to Git and GitHub."));

		User ravi = accounts.student();
		String json = book(ravi, GIT, 1);
		mvc.perform(post("/api/bookings/" + JsonPath.read(json, "$.id") + "/cancel").with(accounts.as(ravi)));
		scan(volunteer, GIT, JsonPath.read(json, "$.ticketCode")).andExpect(jsonPath("$.result").value("INVALID"))
			.andExpect(jsonPath("$.message").value("This booking was cancelled."));

		String unpaid = JsonPath.read(book(accounts.student(), TECH_FEST, 1), "$.ticketCode"); // HELD
		scan(volunteer, TECH_FEST, unpaid).andExpect(jsonPath("$.result").value("INVALID"))
			.andExpect(jsonPath("$.message").value("This booking is not paid yet."));
	}

	@Test
	void onlyVolunteersAndOrganizersOfTheClubCanScan() throws Exception {
		String code = JsonPath.read(book(accounts.student(), GIT, 1), "$.ticketCode");
		scan(accounts.student(), GIT, code).andExpect(status().isForbidden());
		scan(accounts.volunteerOf(2L), GIT, code).andExpect(status().isForbidden()); // another club's volunteer
		scan(accounts.organizerOf(1L), GIT, code).andExpect(jsonPath("$.result").value("VALID"));

		User volunteer = accounts.volunteerOf(1L);
		mvc.perform(get("/api/gate/events").with(accounts.as(volunteer)))
			.andExpect(jsonPath("$[*].clubName").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("Coding Club"))))
			.andExpect(jsonPath("$[?(@.id == 3)]").isNotEmpty());
		mvc.perform(get("/api/gate/events/" + GIT + "/stats").with(accounts.as(volunteer)))
			.andExpect(jsonPath("$.bookedPeople").isNumber());
		mvc.perform(get("/api/gate/events").with(accounts.as(accounts.student()))).andExpect(jsonPath("$.length()").value(0));
	}

}
