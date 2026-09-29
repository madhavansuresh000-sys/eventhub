package com.eventhub.booking;

import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;

import com.eventhub.common.BusinessRuleException;

/**
 * "Two people changed the same row at the same moment" -> just try again.
 *
 * With optimistic locking (@Version) the database refuses the second save instead of letting it
 * overwrite the first. That is safe (never oversold), and the loser simply retries with fresh data,
 * after a short random wait so everybody does not retry at the same instant again.
 * Each attempt must be a NEW transaction (TransactionTemplate), so it reads the latest numbers.
 */
public final class Retry {

	public static final int MAX_ATTEMPTS = 30;

	private Retry() {
	}

	public static <T> T onConflict(Supplier<T> work) {
		for (int attempt = 1; ; attempt++) {
			try {
				return work.get();
			}
			catch (OptimisticLockingFailureException | PessimisticLockingFailureException
					| jakarta.persistence.OptimisticLockException ex) {
				// Pessimistic... = MySQL found a deadlock and cancelled one of the two: also safe to retry
				if (attempt == MAX_ATTEMPTS) {
					throw new BusinessRuleException("Too many people are booking right now. Please try again.");
				}
				sleep(ThreadLocalRandom.current().nextLong(5, 10 + attempt * 10L));
			}
		}
	}

	private static void sleep(long millis) {
		try {
			Thread.sleep(millis);
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException("Interrupted while waiting to retry", ex);
		}
	}

}
