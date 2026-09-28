package com.eventhub.payment;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** "We already handled payment notification evt_123" - the idempotency record. */
@Entity
@Table(name = "processed_payment_events")
@Getter
@Setter
@NoArgsConstructor
public class ProcessedPaymentEvent {

	@Id
	@Column(name = "event_id")
	private String eventId;

	@CreationTimestamp
	@Column(name = "received_at", nullable = false, updatable = false)
	private LocalDateTime receivedAt;

	public ProcessedPaymentEvent(String eventId) {
		this.eventId = eventId;
	}

}
