package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;

import com.eventhub.common.BusinessRuleException;

/** Phase 8 step 1 - a plain unit test: Retry is a small helper, no Spring or database needed. */
class RetryTest {

	@Test
	void triesAgainAfterAConflictAndReturnsTheResult() {
		AtomicInteger calls = new AtomicInteger();

		String result = Retry.onConflict(() -> {
			int call = calls.incrementAndGet();
			if (call == 1) throw new OptimisticLockingFailureException("someone else saved first");
			if (call == 2) throw new PessimisticLockingFailureException("MySQL deadlock");
			return "booked";
		});

		assertThat(result).isEqualTo("booked");
		assertThat(calls).hasValue(3);
	}

	@Test
	void givesUpWithAFriendlyMessageAfterMaxAttempts() {
		AtomicInteger calls = new AtomicInteger();

		assertThatThrownBy(() -> Retry.onConflict(() -> {
			calls.incrementAndGet();
			throw new jakarta.persistence.OptimisticLockException("always busy");
		}))
			.isInstanceOf(BusinessRuleException.class)
			.hasMessage("Too many people are booking right now. Please try again.");
		assertThat(calls).hasValue(Retry.MAX_ATTEMPTS);
	}

	@Test
	void otherErrorsAreNotRetried() {
		AtomicInteger calls = new AtomicInteger();

		assertThatThrownBy(() -> Retry.onConflict(() -> {
			calls.incrementAndGet();
			throw new BusinessRuleException("Sold out");
		})).hasMessage("Sold out");
		assertThat(calls).hasValue(1); // a real "no" must not be asked 30 times
	}

}
