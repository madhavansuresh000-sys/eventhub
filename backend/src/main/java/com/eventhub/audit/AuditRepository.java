package com.eventhub.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditRepository extends JpaRepository<AuditEntry, Long> {

	/** Newest first; id breaks ties when two things happen in the same microsecond. */
	Page<AuditEntry> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

}
