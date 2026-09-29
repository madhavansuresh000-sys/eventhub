package com.eventhub.waitlist;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Every minute: seat offers not accepted within 30 minutes run out, and the seats go to the next student.
 * Switched off in tests (app.scheduling.enabled=false); tests call expireOldOffers() themselves.
 */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class WaitlistOfferJob {

	private final WaitlistService waitlist;

	@Scheduled(fixedDelayString = "${app.waitlist.expiry-check}", initialDelayString = "${app.waitlist.expiry-check}")
	public void run() {
		waitlist.expireOldOffers();
	}

}
