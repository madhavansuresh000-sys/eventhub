package com.eventhub.user;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

	Optional<User> findByEmail(String email);

	/** Login and /me need the roles too: load them in the same query. */
	@EntityGraph(attributePaths = "roles")
	Optional<User> findWithRolesByEmail(String email);

	@EntityGraph(attributePaths = { "roles", "profile" })
	Optional<User> findWithRolesById(Long id);

	boolean existsByEmail(String email);

}
