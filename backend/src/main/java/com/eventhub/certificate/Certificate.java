package com.eventhub.certificate;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.eventhub.booking.Booking;
import com.eventhub.event.Event;
import com.eventhub.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** "This is to certify that ... participated in ...". One per checked-in ticket. */
@Entity
@Table(name = "certificates")
@Getter
@Setter
@NoArgsConstructor
public class Certificate {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Random, printed on the PDF and used by the public verify page, e.g. EH-2026-7QK2MP4X. */
	@Column(nullable = false, unique = true, length = 30)
	private String number;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "booking_id", nullable = false, unique = true)
	private Booking booking;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "event_id", nullable = false)
	private Event event;

	@Column(name = "holder_name", nullable = false, length = 100)
	private String holderName;

	@CreationTimestamp
	@Column(name = "issued_at", nullable = false, updatable = false)
	private LocalDateTime issuedAt;

}
