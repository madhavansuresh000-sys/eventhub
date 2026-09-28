package com.eventhub.club;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ClubMemberRepository extends JpaRepository<ClubMember, Long> {

	Optional<ClubMember> findByClubIdAndUserId(Long clubId, Long userId);

	List<ClubMember> findByClubId(Long clubId);

}
