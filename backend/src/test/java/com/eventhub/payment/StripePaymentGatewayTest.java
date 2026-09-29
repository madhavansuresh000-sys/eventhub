package com.eventhub.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;

import com.eventhub.booking.Booking;
import com.eventhub.event.Event;
import com.eventhub.payment.PaymentGateway.CheckoutSession;
import com.eventhub.user.User;
import com.stripe.exception.ApiConnectionException;
import com.stripe.model.Refund;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import com.stripe.param.checkout.SessionCreateParams.LineItem;

/**
 * Phase 8 step 1 - a UNIT test: no Spring, no database, no internet.
 *
 * The Stripe library talks to Stripe through static methods (Session.create, Session.retrieve ...).
 * Mockito's mockStatic replaces them for the length of one test, so we can check exactly
 * WHAT we would send to Stripe, and what we do with each kind of answer - without a key.
 */
class StripePaymentGatewayTest {

	private static final String KEY = "sk_test_unit";

	private final StripePaymentGateway gateway = new StripePaymentGateway(KEY, "http://localhost:5173");

	private MockedStatic<Session> sessions;

	@BeforeEach
	void fakeStripe() {
		sessions = mockStatic(Session.class);
	}

	@AfterEach
	void realStripeAgain() {
		sessions.close(); // static mocks MUST be closed, or they leak into other tests
	}

	private static Booking booking() {
		User ravi = new User();
		ravi.setEmail("ravi@eventhub.test");
		Event event = new Event();
		event.setTitle("Robo Race");
		event.setPrice(new BigDecimal("100.50"));
		Booking booking = new Booking();
		booking.setId(42L);
		booking.setUser(ravi);
		booking.setEvent(event);
		booking.setQuantity(3);
		return booking;
	}

	private static Session session(String id, String url, String paymentStatus) {
		Session s = mock(Session.class);
		when(s.getId()).thenReturn(id);
		when(s.getUrl()).thenReturn(url);
		when(s.getPaymentStatus()).thenReturn(paymentStatus);
		return s;
	}

	@Test
	void checkoutAsksStripeForTheRightAmountInPaiseAndTheRightReturnPages() {
		ArgumentCaptor<SessionCreateParams> sent = ArgumentCaptor.forClass(SessionCreateParams.class);
		ArgumentCaptor<RequestOptions> options = ArgumentCaptor.forClass(RequestOptions.class);
		// make the fake session FIRST: creating a mock in the middle of another when(...) confuses Mockito
		Session created = session("cs_test_1", "https://checkout.stripe.com/c/pay/cs_test_1", "unpaid");
		sessions.when(() -> Session.create(sent.capture(), options.capture())).thenReturn(created);

		CheckoutSession checkout = gateway.createCheckout(booking());

		assertThat(checkout.sessionId()).isEqualTo("cs_test_1");
		assertThat(checkout.redirectUrl()).isEqualTo("https://checkout.stripe.com/c/pay/cs_test_1");

		SessionCreateParams p = sent.getValue();
		LineItem item = p.getLineItems().getFirst();
		assertThat(item.getQuantity()).isEqualTo(3L);
		assertThat(item.getPriceData().getUnitAmount()).isEqualTo(10050L); // ₹100.50 = 10050 paise
		assertThat(item.getPriceData().getCurrency()).isEqualTo("inr");
		assertThat(item.getPriceData().getProductData().getName()).isEqualTo("Robo Race");
		assertThat(p.getMode()).isEqualTo(SessionCreateParams.Mode.PAYMENT);
		assertThat(p.getMetadata()).containsEntry("booking_id", "42"); // the webhook finds the booking with it
		assertThat(p.getClientReferenceId()).isEqualTo("42");
		assertThat(p.getCustomerEmail()).isEqualTo("ravi@eventhub.test");
		assertThat(p.getSuccessUrl())
			.isEqualTo("http://localhost:5173/payment/success?booking=42&session={CHECKOUT_SESSION_ID}");
		assertThat(p.getCancelUrl()).isEqualTo("http://localhost:5173/payment/cancelled?booking=42");
		// Stripe refuses pages that close sooner than 30 minutes
		assertThat(Instant.ofEpochSecond(p.getExpiresAt()))
			.isBetween(Instant.now().plus(30, ChronoUnit.MINUTES), Instant.now().plus(32, ChronoUnit.MINUTES));
		assertThat(options.getValue().getApiKey()).isEqualTo(KEY);
	}

	@Test
	void stripeDownBecomesAFriendlyPaymentError() {
		sessions.when(() -> Session.create(any(SessionCreateParams.class), any(RequestOptions.class)))
			.thenThrow(new ApiConnectionException("connection refused"));

		assertThatThrownBy(() -> gateway.createCheckout(booking()))
			.isInstanceOf(PaymentProviderException.class)
			.hasMessage("Could not start the payment. Please try again.");
	}

	@Test
	void onlyPaymentStatusPaidCountsAsPaid() {
		Session paid = session("cs_paid", null, "paid");
		Session unpaid = session("cs_unpaid", null, "unpaid");
		sessions.when(() -> Session.retrieve(eq("cs_paid"), any(RequestOptions.class))).thenReturn(paid);
		sessions.when(() -> Session.retrieve(eq("cs_unpaid"), any(RequestOptions.class))).thenReturn(unpaid);

		assertThat(gateway.isPaid("cs_paid")).isTrue();
		assertThat(gateway.isPaid("cs_unpaid")).isFalse();
	}

	@Test
	void closingAPageThatIsAlreadyClosedIsNotAnError() throws Exception {
		Session s = session("cs_1", null, "paid");
		when(s.expire(any(RequestOptions.class))).thenThrow(new ApiConnectionException("already expired"));
		sessions.when(() -> Session.retrieve(eq("cs_1"), any(RequestOptions.class))).thenReturn(s);

		assertThatCode(() -> gateway.expireSession("cs_1")).doesNotThrowAnyException(); // best effort
		verify(s).expire(any(RequestOptions.class));
	}

	@Test
	void refundUsesAnIdempotencyKeySoTwoClicksNeverRefundTwice() {
		Session s = session("cs_1", null, "paid");
		when(s.getPaymentIntent()).thenReturn("pi_123");
		sessions.when(() -> Session.retrieve(eq("cs_1"), any(RequestOptions.class))).thenReturn(s);

		try (MockedStatic<Refund> refunds = mockStatic(Refund.class)) {
			ArgumentCaptor<RefundCreateParams> params = ArgumentCaptor.forClass(RefundCreateParams.class);
			ArgumentCaptor<RequestOptions> options = ArgumentCaptor.forClass(RequestOptions.class);
			refunds.when(() -> Refund.create(params.capture(), options.capture())).thenReturn(mock(Refund.class));

			gateway.refund("cs_1");

			assertThat(params.getValue().getPaymentIntent()).isEqualTo("pi_123");
			assertThat(options.getValue().getIdempotencyKey()).isEqualTo("refund-cs_1");
			assertThat(options.getValue().getApiKey()).isEqualTo(KEY);
		}
	}

}
