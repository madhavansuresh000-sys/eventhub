package com.eventhub.certificate.dto;

import java.time.LocalDateTime;

import com.eventhub.certificate.Certificate;

/**
 * A certificate as shown on "My certificates" and on the PUBLIC verify page.
 * Only what the paper certificate itself shows - no email, no booking details.
 */
public record CertificateResponse(
		String number,
		String holderName,
		String eventTitle,
		String venue,
		LocalDateTime eventStart,
		String clubName,
		String clubSlug,
		LocalDateTime issuedAt) {

	public static CertificateResponse from(Certificate c) {
		var e = c.getEvent();
		return new CertificateResponse(c.getNumber(), c.getHolderName(), e.getTitle(), e.getVenue(), e.getStartTime(),
				e.getClub().getName(), e.getClub().getSlug(), c.getIssuedAt());
	}

}
