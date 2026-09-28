package com.eventhub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CsrfFilter;

import com.eventhub.auth.CsrfCookieFilter;
import com.eventhub.auth.JwtCookieFilter;
import com.eventhub.auth.JwtService;
import com.eventhub.auth.SecurityProblems;

/**
 * Who may call which URL (Phase 5).
 *
 *   visitors   : browse events, clubs and tags; register; log in
 *   logged in  : everything else (organizer URLs also check the club in @PreAuthorize, see ClubAccess)
 *   ADMIN only : /api/admin/**, approve and reject
 *
 * Like the college gate: the JwtCookieFilter reads your ID card, these rules decide which rooms it opens.
 */
@Configuration
@EnableMethodSecurity // turns on @PreAuthorize on controller methods
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, JwtService jwtService) throws Exception {
		http
			// no server-side session: every request carries its own JWT cookie
			.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			// CSRF for a single-page app: the server sets an XSRF-TOKEN cookie that JavaScript CAN read;
			// Axios copies it into the X-XSRF-TOKEN header. Another website cannot read our cookie,
			// so it cannot send a valid header, and its forged POST gets 403.
			// sessionAuthenticationStrategy: Spring normally makes a NEW CSRF token whenever someone "logs in".
			// Without server sessions it thinks every request with our JWT cookie is a new login, so the token
			// changed on every request and a second request sent at the same moment could fail. Keep one token.
			.csrf(csrf -> csrf.spa().sessionAuthenticationStrategy((authentication, request, response) -> { }))
			.addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
			// use the rules from CorsConfig (browser calls from other addresses)
			.cors(Customizer.withDefaults())
			.addFilterBefore(new JwtCookieFilter(jwtService), UsernamePasswordAuthenticationFilter.class)
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/api/health", "/actuator/health",
						"/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
				.requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/logout", "/api/auth/me").permitAll()
				// public catalogue: anyone can browse events, clubs and tags
				.requestMatchers(HttpMethod.GET, "/api/events/**", "/api/clubs/**", "/api/tags").permitAll()
				// admin work
				.requestMatchers("/api/admin/**").hasRole("ADMIN")
				.requestMatchers(HttpMethod.POST, "/api/events/*/approve", "/api/events/*/reject").hasRole("ADMIN")
				// everything else (create / edit / submit events, organizer screens ...) needs login;
				// the controllers then check "organizer of THIS club" with @PreAuthorize
				.anyRequest().authenticated())
			.exceptionHandling(ex -> ex
				.authenticationEntryPoint(SecurityProblems.notLoggedIn())
				.accessDeniedHandler(SecurityProblems.forbidden()));
		return http.build();
	}

}
