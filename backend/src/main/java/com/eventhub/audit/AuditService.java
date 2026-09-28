package com.eventhub.audit;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.auth.CurrentUser;
import com.eventhub.common.BadRequestException;
import com.eventhub.common.PageResponse;
import com.eventhub.event.Event;

import lombok.RequiredArgsConstructor;

/**
 * Writes and reads the audit log. EventService calls record(...) INSIDE its own transaction,
 * so the change and its log line are saved together (or neither is).
 */
@Service
@RequiredArgsConstructor
public class AuditService {

	private static final int MAX_PAGE_SIZE = 50;

	private final AuditRepository entries;

	/** Who did it comes from the logged-in user of this request (empty for system jobs and service tests). */
	public void record(AuditAction action, Event event, String details) {
		AuditEntry entry = new AuditEntry();
		entry.setAction(action);
		entry.setEventId(event.getId());
		entry.setEventTitle(event.getTitle());
		entry.setDetails(details);
		CurrentUser.get().ifPresent(user -> {
			entry.setUserId(user.id());
			entry.setUserName(user.fullName());
			entry.setUserEmail(user.email());
		});
		entries.save(entry);
	}

	@Transactional(readOnly = true)
	public PageResponse<AuditResponse> latest(int page, int size) {
		if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
			throw new BadRequestException("page must be 0 or more and size between 1 and " + MAX_PAGE_SIZE);
		}
		return PageResponse.from(entries.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(page, size)),
				AuditResponse::from);
	}

}
