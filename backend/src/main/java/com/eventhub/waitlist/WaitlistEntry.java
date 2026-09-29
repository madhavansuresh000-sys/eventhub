package com.eventhub.waitlist;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.eventhub.booking.Booking;
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

/** One student's place in the queue of a sold-out event. */
@Entity
@Table(name = "waitlist_entries")
@Getter
@Setter
@NoArgsConstructor
public class WaitlistEntry {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "event_id", nullable = false)
	private Event event;

	/** How many seats the student wants (a group of friends waits together). */
	@Column(nullable = false)
	private int quantity;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private WaitlistStatus status;

	@Column(name = "offer_expires_at")
	private LocalDateTime offerExpiresAt;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "booking_id")
	private Booking booking;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "offered_at")
	private LocalDateTime offeredAt;

	@Column(name = "closed_at")
	private LocalDateTime closedAt;

	@Version
	@Column(nullable = false)
	private int version;

	public void close(WaitlistStatus finalStatus, LocalDateTime now) {
		this.status = finalStatus;
		this.offerExpiresAt = null;
		this.closedAt = now;
	}

}
