package com.eventhub.auth;

import java.util.Locale;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.user.User;
import com.eventhub.user.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * Tells Spring Security how to find a user by email when someone logs in.
 * Spring then compares the typed password with the BCrypt hash for us.
 */
@Service
@RequiredArgsConstructor
public class DbUserDetailsService implements UserDetailsService {

	private final UserRepository users;

	@Override
	@Transactional(readOnly = true)
	public UserDetails loadUserByUsername(String email) {
		User user = users.findWithRolesByEmail(email.trim().toLowerCase(Locale.ROOT))
			.orElseThrow(() -> new UsernameNotFoundException("No user with this email"));
		return org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
			.password(user.getPasswordHash())
			.disabled(!user.isEnabled())
			.roles(user.getRoles().stream().map(r -> r.getName()).toArray(String[]::new))
			.build();
	}

}
