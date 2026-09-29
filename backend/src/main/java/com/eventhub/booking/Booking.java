package com.eventhub.booking;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.eventhub.event.Event;
import com.eventhub.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One student's seats for one event. */
@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
public class Booking {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "event_id", nullable = false)
	private Event event;

	@Column(nullable = false)
	private int quantity;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private BookingStatus status;

	/** price x quantity at the moment of booking. */
	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal amount;

	/** Printed in the QR code; checked at the gate in Phase 7. */
	@Column(name = "ticket_code", nullable = false, unique = true, length = 40)
	private String ticketCode;

	@Column(name = "hold_expires_at")
	private LocalDateTime holdExpiresAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "confirmed_at")
	private LocalDateTime confirmedAt;

	@Column(name = "cancelled_at")
	private LocalDateTime cancelledAt;

	/** Scanned at the gate (Phase 7). Set once, by a conditional UPDATE - see BookingRepository.markCheckedIn. */
	@Column(name = "checked_in_at")
	private LocalDateTime checkedInAt;

	/** The volunteer / organizer who scanned it. */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "checked_in_by")
	private User checkedInBy;

	/** When the day-before reminder was sent (sent once). */
	@Column(name = "reminder_sent_at")
	private LocalDateTime reminderSentAt;

	/** Stops the payment webhook and the expiry job from changing the same booking at the same moment. */
	@Version
	@Column(nullable = false)
	private int version;

}
