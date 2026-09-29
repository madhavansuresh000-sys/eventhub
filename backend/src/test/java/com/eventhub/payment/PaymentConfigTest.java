package com.eventhub.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

/** Phase 9: which payment gateway starts on which server. */
class PaymentConfigTest {

	private final PaymentConfig config = new PaymentConfig();

	private static MockEnvironment prod() {
		MockEnvironment env = new MockEnvironment();
		env.setActiveProfiles("prod");
		return env;
	}

	@Test
	void laptopWithoutStripeKeyUsesTheTestPage() {
		assertThat(config.paymentGateway("", "http://localhost:5173", false, new MockEnvironment()))
			.isInstanceOf(FakePaymentGateway.class);
	}

	@Test
	void realServerWithoutStripeKeyRefusesToStart() {
		assertThatThrownBy(() -> config.paymentGateway("", "https://eventhub.example", false, prod()))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("STRIPE_SECRET_KEY is required in prod");
	}

	@Test
	void demoServerMayAllowTheTestPageOnPurpose() {
		assertThat(config.paymentGateway("", "https://eventhub.example", true, prod()))
			.isInstanceOf(FakePaymentGateway.class);
	}

	@Test
	void aStripeKeyAlwaysWins() {
		assertThat(config.paymentGateway("sk_test_123", "https://eventhub.example", true, prod()))
			.isInstanceOf(StripePaymentGateway.class);
	}

}
