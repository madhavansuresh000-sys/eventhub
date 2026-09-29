package com.eventhub.certificate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.auth.TestAccounts;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.user.User;
import com.jayway.jsonpath.JsonPath;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;

/**
 * Phase 7 step 5: certificates. Event 3 = Intro to Git (free, Coding Club = club 1).
 * Asha and Bala both book; only Asha is scanned at the gate; then the event is "over".
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CertificateFlowTest {

	private static final long GIT = 3;

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	@Autowired
	private EventRepository events;

	private User asha;

	private User bala;

	/** Both book, only Asha comes to the gate. endsInPast: move the event to yesterday afterwards. */
	private void ashaAttendsBalaDoesNot(boolean endsInPast) throws Exception {
		asha = accounts.student();
		bala = accounts.student();
		String ashaCode = JsonPath.read(book(asha), "$.ticketCode");
		book(bala);
		mvc.perform(post("/api/gate/events/" + GIT + "/check-in").with(accounts.as(accounts.volunteerOf(1L)))
				.contentType(MediaType.APPLICATION_JSON).content("{\"code\": \"" + ashaCode + "\"}"))
			.andExpect(jsonPath("$.result").value("VALID"));
		if (endsInPast) {
			Event git = events.findById(GIT).orElseThrow();
			git.setStartTime(LocalDateTime.now().minusDays(1).withHour(14).withMinute(0));
			git.setEndTime(LocalDateTime.now().minusDays(1).withHour(17).withMinute(0));
			events.saveAndFlush(git);
		}
	}

	private String book(User user) throws Exception {
		return mvc.perform(post("/api/bookings").with(accounts.as(user)).contentType(MediaType.APPLICATION_JSON)
				.content("{\"eventId\": " + GIT + ", \"quantity\": 1}"))
			.andReturn().getResponse().getContentAsString();
	}

	private String myCertificates(User user) throws Exception {
		return mvc.perform(get("/api/certificates/mine").with(accounts.as(user)))
			.andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();
	}

	@Test
	void onlyCheckedInStudentsGetACertificate() throws Exception {
		ashaAttendsBalaDoesNot(true);

		String json = myCertificates(asha);
		assertThat((Integer) JsonPath.read(json, "$.length()")).isEqualTo(1);
		assertThat((String) JsonPath.read(json, "$[0].number")).matches("EH-\\d{4}-[A-Z2-9]{8}");
		assertThat((String) JsonPath.read(json, "$[0].holderName")).isEqualTo(asha.getFullName());
		assertThat((String) JsonPath.read(json, "$[0].eventTitle")).isEqualTo("Intro to Git and GitHub");

		assertThat(myCertificates(bala)).isEqualTo("[]"); // booked, but never came through the gate
		assertThat(myCertificates(asha)).isEqualTo(json); // opening the page again does not make a second one
	}

	@Test
	void noCertificateBeforeTheEventIsOver() throws Exception {
		ashaAttendsBalaDoesNot(false);
		assertThat(myCertificates(asha)).isEqualTo("[]");
	}

	@Test
	void theOwnerDownloadsARealPdfWithTheirName() throws Exception {
		ashaAttendsBalaDoesNot(true);
		String number = JsonPath.read(myCertificates(asha), "$[0].number");

		byte[] pdf = mvc.perform(get("/api/certificates/" + number + "/pdf").with(accounts.as(asha)))
			.andExpect(status().isOk())
			.andExpect(content().contentType(MediaType.APPLICATION_PDF))
			.andExpect(header().string("Content-Disposition", "attachment; filename=\"EventHub-certificate-" + number + ".pdf\""))
			.andReturn().getResponse().getContentAsByteArray();

		// open the PDF like a PDF viewer would and read its text
		PdfReader reader = new PdfReader(pdf);
		String text = new PdfTextExtractor(reader).getTextFromPage(1);
		reader.close();
		assertThat(reader.getNumberOfPages()).isEqualTo(1);
		assertThat(text).contains("Certificate of Participation", asha.getFullName(), "Intro to Git and GitHub", number);

		mvc.perform(get("/api/certificates/" + number + "/pdf").with(accounts.as(bala))).andExpect(status().isNotFound());
	}

	@Test
	void anyoneCanVerifyACertificateNumberWithoutLoggingIn() throws Exception {
		ashaAttendsBalaDoesNot(true);
		String number = JsonPath.read(myCertificates(asha), "$[0].number");

		mvc.perform(get("/api/certificates/verify/" + number.toLowerCase())) // no login cookie
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.number").value(number))
			.andExpect(jsonPath("$.holderName").value(asha.getFullName()))
			.andExpect(jsonPath("$.clubName").value("Coding Club"))
			.andExpect(jsonPath("$.email").doesNotExist());
		mvc.perform(get("/api/certificates/verify/EH-2026-FAKEFAKE")).andExpect(status().isNotFound());
		mvc.perform(get("/api/certificates/mine")).andExpect(status().isUnauthorized());
	}

}
