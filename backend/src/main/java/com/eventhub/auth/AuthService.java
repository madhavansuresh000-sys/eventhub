package com.eventhub.auth;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.auth.dto.MeResponse;
import com.eventhub.auth.dto.RegisterRequest;
import com.eventhub.club.ClubMemberRepository;
import com.eventhub.common.BusinessRuleException;
import com.eventhub.common.ResourceNotFoundException;
import com.eventhub.user.Profile;
import com.eventhub.user.ProfileRepository;
import com.eventhub.user.Role;
import com.eventhub.user.RoleRepository;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;

import lombok.RequiredArgsConstructor;

/** Creating accounts and describing the logged-in user. Login itself is done by Spring Security. */
@Service
@RequiredArgsConstructor
public class AuthService {

	public static final String STUDENT = "STUDENT";

	public static final String ADMIN = "ADMIN";

	private final UserRepository users;

	private final RoleRepository roles;

	private final ProfileRepository profiles;

	private final ClubMemberRepository members;

	private final PasswordEncoder passwordEncoder;

	/**
	 * New STUDENT account. The password is stored only as a BCrypt hash: a one-way "fingerprint"
	 * with a random salt, so even we cannot see the real password, and two users with the same
	 * password get different hashes.
	 */
	@Transactional
	public User register(RegisterRequest request) {
		String email = normalizeEmail(request.email());
		if (users.existsByEmail(email)) {
			throw new BusinessRuleException("An account with this email already exists. Try logging in.");
		}
		User user = new User();
		user.setFullName(request.fullName().trim());
		user.setEmail(email);
		user.setPasswordHash(passwordEncoder.encode(request.password()));
		user.getRoles().add(role(STUDENT));
		users.save(user);

		Profile profile = new Profile();
		profile.setUser(user);
		profile.setDepartment(blankToNull(request.department()));
		profile.setYearOfStudy(request.yearOfStudy());
		profiles.save(profile);
		user.setProfile(profile);
		return user;
	}

	/** Loaded with roles, ready for JwtService.issue(). */
	@Transactional(readOnly = true)
	public User findForToken(String email) {
		return users.findWithRolesByEmail(normalizeEmail(email))
			.orElseThrow(() -> new ResourceNotFoundException("User", email));
	}

	@Transactional(readOnly = true)
	public MeResponse me(Long userId) {
		User user = users.findWithRolesById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
		return toMe(user);
	}

	@Transactional(readOnly = true)
	public MeResponse toMe(User user) {
		var clubs = members.findByUserIdOrderByClubId(user.getId()).stream()
			.map(m -> new MeResponse.Membership(m.getClub().getId(), m.getClub().getName(), m.getClub().getSlug(),
					m.getClubRole().name()))
			.toList();
		Profile profile = user.getProfile();
		return new MeResponse(user.getId(), user.getFullName(), user.getEmail(),
				profile == null ? null : profile.getDepartment(),
				profile == null ? null : profile.getYearOfStudy(),
				user.getRoles().stream().map(Role::getName).sorted().toList(),
				clubs);
	}

	Role role(String name) {
		return roles.findByName(name).orElseThrow(() -> new IllegalStateException("Role " + name + " is missing"));
	}

	/** Emails are stored in lower case, so "Ravi@College.edu" and "ravi@college.edu" are the same account. */
	public static String normalizeEmail(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private static String blankToNull(String s) {
		return s == null || s.isBlank() ? null : s.trim();
	}

}
