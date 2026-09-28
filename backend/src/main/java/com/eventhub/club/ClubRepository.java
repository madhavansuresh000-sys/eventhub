package com.eventhub.club;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ClubRepository extends JpaRepository<Club, Long> {

	Optional<Club> findBySlug(String slug);

}
