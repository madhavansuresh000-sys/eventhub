package com.eventhub.club;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClubMemberRepository extends JpaRepository<ClubMember, Long> {

	List<ClubMember> findByClubId(Long clubId);

	/** The clubs a user helps run, with the club loaded (for /api/auth/me). */
	@EntityGraph(attributePaths = "club")
	List<ClubMember> findByUserIdOrderByClubId(Long userId);

	/** "Is user 7 an ORGANIZER of club 1?" - used by the security checks (ClubAccess). */
	boolean existsByClubIdAndUserIdAndClubRole(Long clubId, Long userId, ClubRole clubRole);

}
