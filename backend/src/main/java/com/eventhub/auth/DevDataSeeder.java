package com.eventhub.auth;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.club.ClubMember;
import com.eventhub.club.ClubMemberRepository;
import com.eventhub.club.ClubRepository;
import com.eventhub.club.ClubRole;
import com.eventhub.user.Profile;
import com.eventhub.user.ProfileRepository;
import com.eventhub.user.RoleRepository;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;

/**
 * DEV ONLY: creates demo accounts so every role can be tried on your laptop.
 * Not a Flyway migration on purpose: migrations also run on the real server, and a demo
 * admin with a known password there would be a security hole.
 * Runs only with the "dev" profile AND when DEMO_PASSWORD is set in .env. Existing accounts are left alone.
 */
@Component
@org.springframework.context.annotation.Profile("dev")
public class DevDataSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

	/** email, name, global role, club id (or null), club role (or null) */
	private record Demo(String email, String name, String role, Long clubId, ClubRole clubRole) {
	}

	private static final List<Demo> DEMOS = List.of(
			new Demo("admin@eventhub.test", "Admin Office", AuthService.ADMIN, null, null),
			new Demo("madhavan@eventhub.test", "Madhavan Suresh", AuthService.STUDENT, 1L, ClubRole.ORGANIZER),
			new Demo("kavya@eventhub.test", "Kavya M", AuthService.STUDENT, 2L, ClubRole.ORGANIZER),
			new Demo("priya@eventhub.test", "Priya Raman", AuthService.STUDENT, 1L, ClubRole.VOLUNTEER),
			new Demo("ravi@eventhub.test", "Ravi Kumar", AuthService.STUDENT, null, null));

	private final String password;

	private final UserRepository users;

	private final RoleRepository roles;

	private final ProfileRepository profiles;

	private final ClubRepository clubs;

	private final ClubMemberRepository members;

	private final PasswordEncoder passwordEncoder;

	public DevDataSeeder(@Value("${app.demo.password:}") String password, UserRepository users, RoleRepository roles,
			ProfileRepository profiles, ClubRepository clubs, ClubMemberRepository members, PasswordEncoder passwordEncoder) {
		this.password = password;
		this.users = users;
		this.roles = roles;
		this.profiles = profiles;
		this.clubs = clubs;
		this.members = members;
		this.passwordEncoder = passwordEncoder;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (password.isBlank()) {
			return;
		}
		int created = 0;
		for (Demo demo : DEMOS) {
			if (users.existsByEmail(demo.email())) {
				continue;
			}
			User user = new User();
			user.setEmail(demo.email());
			user.setFullName(demo.name());
			user.setPasswordHash(passwordEncoder.encode(password));
			user.getRoles().add(roles.findByName(demo.role()).orElseThrow());
			users.save(user);

			Profile profile = new Profile();
			profile.setUser(user);
			profile.setDepartment(AuthService.ADMIN.equals(demo.role()) ? null : "CSE");
			profile.setYearOfStudy(AuthService.ADMIN.equals(demo.role()) ? null : 3);
			profiles.save(profile);

			if (demo.clubId() != null) {
				ClubMember member = new ClubMember();
				member.setUser(user);
				member.setClub(clubs.getReferenceById(demo.clubId()));
				member.setClubRole(demo.clubRole());
				members.save(member);
			}
			created++;
		}
		if (created > 0) {
			log.info("Created {} demo accounts (*@eventhub.test, password = DEMO_PASSWORD in .env)", created);
		}
	}

}
