package com.eventhub.booking;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Step 4: every minute, unpaid holds older than 10 minutes expire and their seats go back on sale.
 * Like the cinema counter: "your seats were kept for 10 minutes; you did not pay, so they are free again".
 * Switched off in tests (app.scheduling.enabled=false); tests call expireOldHolds() themselves.
 */
@Component
@EnableScheduling
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class HoldExpiryJob {

	private final BookingService bookings;

	@Scheduled(fixedDelayString = "${app.booking.expiry-check}", initialDelayString = "${app.booking.expiry-check}")
	public void run() {
		bookings.expireOldHolds();
	}

}
