package com.eventhub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

/**
 * Health check, API docs and the event catalogue are open to everyone;
 * everything else needs login (real login comes in Phase 5).
 */
@Configuration
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
			.csrf(AbstractHttpConfigurer::disable)
			// use the rules from CorsConfig (browser calls from other addresses)
			.cors(Customizer.withDefaults())
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/api/health", "/actuator/health",
						"/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
				// public catalogue: anyone can browse events, clubs and tags
				.requestMatchers(HttpMethod.GET, "/api/events/**", "/api/clubs/**", "/api/tags").permitAll()
				// TEMPORARY (Phase 2): create/update/approve are open so they can be tested in Postman.
				// Phase 5 restricts them to logged-in organizers and admins.
				.requestMatchers("/api/events/**").permitAll()
				// TEMPORARY (Phase 4): organizer and admin screens. Phase 5: hasRole("ORGANIZER") / hasRole("ADMIN").
				.requestMatchers("/api/organizer/**", "/api/admin/**").permitAll()
				.anyRequest().authenticated())
			// not logged in -> 401 (instead of the default 403)
			.exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
		return http.build();
	}

}
