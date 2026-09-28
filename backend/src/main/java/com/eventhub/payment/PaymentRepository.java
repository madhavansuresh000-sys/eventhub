package com.eventhub.payment;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

	@EntityGraph(attributePaths = { "booking", "booking.event" })
	Optional<Payment> findBySessionId(String sessionId);

	List<Payment> findByBookingIdAndStatus(Long bookingId, PaymentStatus status);

}
