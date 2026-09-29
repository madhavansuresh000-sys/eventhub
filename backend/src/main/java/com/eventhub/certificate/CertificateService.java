package com.eventhub.certificate;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.eventhub.booking.Booking;
import com.eventhub.booking.BookingRepository;
import com.eventhub.certificate.dto.CertificateResponse;
import com.eventhub.common.ResourceNotFoundException;

/**
 * Certificates (Phase 7 step 5).
 *
 * RULE: a certificate only for a ticket that was scanned at the gate (checked_in_at) of an event that has ended.
 * Booked but did not come = no certificate. That is why the gate check-in matters.
 *
 * Certificates are issued the first time the student opens "My certificates" after the event
 * (no nightly job needed). Opening the page twice at the same moment cannot make two: booking_id is UNIQUE.
 */
@Service
public class CertificateService {

	private static final Logger log = LoggerFactory.getLogger(CertificateService.class);

	private static final char[] CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray(); // no 0/O, 1/I

	private static final SecureRandom RANDOM = new SecureRandom();

	private final CertificateRepository certificates;

	private final BookingRepository bookings;

	private final CertificatePdf pdf;

	private final TransactionTemplate tx;

	public CertificateService(CertificateRepository certificates, BookingRepository bookings, CertificatePdf pdf,
			PlatformTransactionManager txManager) {
		this.certificates = certificates;
		this.bookings = bookings;
		this.pdf = pdf;
		this.tx = new TransactionTemplate(txManager);
	}

	/** My certificates: first issue any that were earned since last time, then list them all. */
	public List<CertificateResponse> mine(Long userId) {
		for (Long bookingId : bookings.findIdsEarningCertificate(userId, LocalDateTime.now())) {
			if (!certificates.existsByBookingId(bookingId)) {
				issue(bookingId);
			}
		}
		return tx.execute(s -> certificates.findByUserIdOrderByIssuedAtDesc(userId).stream()
			.map(CertificateResponse::from).toList());
	}

	private void issue(Long bookingId) {
		try {
			// its own small transaction: a duplicate (page opened twice) does not spoil the others
			tx.executeWithoutResult(s -> {
				Booking b = bookings.findWithEventById(bookingId).orElseThrow();
				Certificate c = new Certificate();
				c.setNumber(newNumber(b.getEvent().getStartTime().getYear()));
				c.setBooking(b);
				c.setUser(b.getUser());
				c.setEvent(b.getEvent());
				c.setHolderName(b.getUser().getFullName());
				certificates.saveAndFlush(c);
				log.info("Issued certificate {} for booking {}", c.getNumber(), bookingId);
			});
		}
		catch (DataIntegrityViolationException alreadyThere) {
			// the same page was opened twice at the same moment: the other request made it - fine
		}
	}

	/** The PDF - only for the certificate's owner (anyone else: 404, like a missing one). */
	public Download pdf(Long userId, String number) {
		return tx.execute(s -> {
			Certificate c = certificates.findByNumber(normalise(number))
				.filter(x -> x.getUser().getId().equals(userId))
				.orElseThrow(() -> new ResourceNotFoundException("Certificate", number));
			return new Download("EventHub-certificate-" + c.getNumber() + ".pdf", pdf.render(c));
		});
	}

	/** PUBLIC: "is this certificate real?" */
	public CertificateResponse verify(String number) {
		return tx.execute(s -> certificates.findByNumber(normalise(number))
			.map(CertificateResponse::from)
			.orElseThrow(() -> new ResourceNotFoundException("Certificate", number)));
	}

	public record Download(String fileName, byte[] bytes) {
	}

	private static String normalise(String number) {
		return number.trim().toUpperCase(Locale.ROOT);
	}

	/** EH-2026-7QK2MP4X : 8 random characters = about 1 million million possibilities. */
	private static String newNumber(int year) {
		StringBuilder code = new StringBuilder("EH-").append(year).append('-');
		for (int i = 0; i < 8; i++) {
			code.append(CODE_CHARS[RANDOM.nextInt(CODE_CHARS.length)]);
		}
		return code.toString();
	}

}
