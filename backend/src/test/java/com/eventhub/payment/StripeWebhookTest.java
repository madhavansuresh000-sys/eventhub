package com.eventhub.payment;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

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
import com.jayway.jsonpath.JsonPath;
import com.stripe.Stripe;

/**
 * Phase 6 steps 7-8: the Stripe webhook. We sign test messages exactly like Stripe does:
 *   Stripe-Signature: t=<time>,v1=HMAC_SHA256(secret, "<time>.<body>")
 */
@SpringBootTest(properties = "app.stripe.webhook-secret=whsec_test_secret")
@AutoConfigureMockMvc
@Transactional
class StripeWebhookTest {

	private static final String SECRET = "whsec_test_secret";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	private static String sign(String body, String secret) throws Exception {
		long t = Instant.now().getEpochSecond();
		Mac mac = Mac.getInstance("HmacSHA256");
		mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
		String v1 = HexFormat.of().formatHex(mac.doFinal((t + "." + body).getBytes(StandardCharsets.UTF_8)));
		return "t=" + t + ",v1=" + v1;
	}

	private static String paidEvent(String eventId, String sessionId) {
		return """
				{"id": "%s", "object": "event", "api_version": "%s", "type": "checkout.session.completed",
				 "data": {"object": {"id": "%s", "object": "checkout.session", "payment_status": "paid"}}}
				""".formatted(eventId, Stripe.API_VERSION, sessionId);
	}

	private ResultActions webhook(String body, String signature) throws Exception {
		return mvc.perform(post("/api/payments/stripe/webhook") // no login cookie, no CSRF token: like Stripe
			.contentType(MediaType.APPLICATION_JSON).header("Stripe-Signature", signature).content(body));
	}

	/** A HELD booking with an open payment session; returns {bookingId, sessionId}. */
	private String[] heldBookingWithSession(User ravi) throws Exception {
		String booking = mvc.perform(post("/api/bookings").with(accounts.as(ravi)).contentType(MediaType.APPLICATION_JSON)
			.content("{\"eventId\": 1, \"quantity\": 1}")).andReturn().getResponse().getContentAsString();
		String id = String.valueOf((Number) JsonPath.read(booking, "$.id"));
		String pay = mvc.perform(post("/api/bookings/" + id + "/pay").with(accounts.as(ravi)))
			.andReturn().getResponse().getContentAsString();
		return new String[] { id, JsonPath.read(pay, "$.sessionId") };
	}

	@Test
	void signedWebhookConfirmsTheBookingOnce() throws Exception {
		User ravi = accounts.student();
		String[] b = heldBookingWithSession(ravi);
		String body = paidEvent("evt_test_1", b[1]);

		webhook(body, sign(body, SECRET)).andExpect(status().isOk());
		mvc.perform(get("/api/bookings/" + b[0]).with(accounts.as(ravi))).andExpect(jsonPath("$.status").value("CONFIRMED"));

		// Stripe retries the SAME event: still 200 (so Stripe stops), nothing changes
		webhook(body, sign(body, SECRET)).andExpect(status().isOk());
		mvc.perform(get("/api/bookings/" + b[0]).with(accounts.as(ravi))).andExpect(jsonPath("$.status").value("CONFIRMED"));
	}

	@Test
	void fakeOrChangedSignatureIsRejected() throws Exception {
		User ravi = accounts.student();
		String[] b = heldBookingWithSession(ravi);
		String body = paidEvent("evt_test_2", b[1]);

		webhook(body, sign(body, "whsec_someone_else")).andExpect(status().isBadRequest());
		webhook(body.replace("paid", "PAID"), sign(body, SECRET)).andExpect(status().isBadRequest()); // body changed
		webhook(body, "t=1,v1=abc").andExpect(status().isBadRequest());
		mvc.perform(get("/api/bookings/" + b[0]).with(accounts.as(ravi))).andExpect(jsonPath("$.status").value("HELD"));
	}

}
