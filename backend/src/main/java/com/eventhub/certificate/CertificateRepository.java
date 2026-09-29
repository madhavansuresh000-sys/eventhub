package com.eventhub.certificate;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {

	@EntityGraph(attributePaths = { "event", "event.club", "user" })
	Optional<Certificate> findByNumber(String number);

	@EntityGraph(attributePaths = { "event", "event.club" })
	List<Certificate> findByUserIdOrderByIssuedAtDesc(Long userId);

	boolean existsByBookingId(Long bookingId);

}
