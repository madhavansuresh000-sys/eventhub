package com.eventhub.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProcessedPaymentEventRepository extends JpaRepository<ProcessedPaymentEvent, String> {

	/**
	 * A plain INSERT on purpose: save() would quietly UPDATE an existing row, but we WANT the
	 * duplicate-key error, because that error is how we notice "this notice was already handled".
	 */
	@Modifying
	@Query(value = "insert into processed_payment_events (event_id) values (:id)", nativeQuery = true)
	void insert(@Param("id") String eventId);

}
