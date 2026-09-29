package com.eventhub.auth;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.club.ClubMemberRepository;
import com.eventhub.club.ClubRole;
import com.eventhub.event.EventRepository;

import lombok.RequiredArgsConstructor;

/**
 * Club-level permissions, used in @PreAuthorize on the controllers, e.g.
 *   @PreAuthorize("@clubAccess.canManageEvent(#id)")
 *
 * Club roles are NOT inside the JWT: they are read from club_members on each check,
 * so removing someone as organizer works at once (no need to wait for their token to expire).
 */
@Component("clubAccess")
@RequiredArgsConstructor
public class ClubAccess {

	private final ClubMemberRepository members;

	private final EventRepository events;

	/** Is the logged-in user an ORGANIZER of this club? */
	@Transactional(readOnly = true)
	public boolean isOrganizer(Long clubId) {
		return has(clubId, ClubRole.ORGANIZER);
	}

	/** May the logged-in user edit / submit this event? Only organizers of the event's own club. */
	@Transactional(readOnly = true)
	public boolean canManageEvent(Long eventId) {
		return events.findClubIdById(eventId).map(this::isOrganizer).orElse(false);
	}

	/** Volunteers (gate duty) and organizers of this club may scan tickets (Phase 7). */
	@Transactional(readOnly = true)
	public boolean canScan(Long clubId) {
		return has(clubId, ClubRole.VOLUNTEER) || has(clubId, ClubRole.ORGANIZER);
	}

	/** May the logged-in user scan tickets of this event? Volunteers and organizers of the event's club. */
	@Transactional(readOnly = true)
	public boolean canScanEvent(Long eventId) {
		return events.findClubIdById(eventId).map(this::canScan).orElse(false);
	}

	private boolean has(Long clubId, ClubRole role) {
		return clubId != null && CurrentUser.get()
			.map(user -> members.existsByClubIdAndUserIdAndClubRole(clubId, user.id(), role))
			.orElse(false);
	}

}
