package com.eventhub.auth;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.WebUtils;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Runs once for EVERY request, before the security rules:
 * cookie present and token valid -> "this request is user 7 with role STUDENT".
 * No cookie, a fake token or an expired one -> the request simply continues as a visitor,
 * and the rules in SecurityConfig decide (401 for pages that need login).
 * Created in SecurityConfig (not a @Component, so it is not also registered as a plain servlet filter).
 */
public class JwtCookieFilter extends OncePerRequestFilter {

	private final JwtService jwtService;

	public JwtCookieFilter(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		Cookie cookie = WebUtils.getCookie(request, AuthCookies.NAME);
		if (cookie != null && !cookie.getValue().isBlank()) {
			jwtService.read(cookie.getValue()).ifPresent(jwt -> {
				CurrentUser user = new CurrentUser(Long.valueOf(jwt.getSubject()),
						jwt.getClaimAsString("email"), jwt.getClaimAsString("name"));
				List<SimpleGrantedAuthority> authorities = JwtService.roles(jwt).stream()
					.map(role -> new SimpleGrantedAuthority("ROLE_" + role))
					.toList();
				SecurityContext context = SecurityContextHolder.createEmptyContext();
				context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user, null, authorities));
				SecurityContextHolder.setContext(context);
			});
		}
		chain.doFilter(request, response);
	}

}
