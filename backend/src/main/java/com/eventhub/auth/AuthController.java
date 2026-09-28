package com.eventhub.auth;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.auth.dto.LoginRequest;
import com.eventhub.auth.dto.MeResponse;
import com.eventhub.auth.dto.RegisterRequest;
import com.eventhub.user.User;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

/**
 * Register, login, logout and "who am I".
 * The token never appears in the JSON: it travels only in the httpOnly cookie.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	private final AuthenticationManager authenticationManager;

	private final JwtService jwtService;

	private final AuthCookies cookies;

	/** Creates a STUDENT account and logs it in straight away. 201 + cookie. */
	@PostMapping("/register")
	public ResponseEntity<MeResponse> register(@Valid @RequestBody RegisterRequest request) {
		User user = authService.register(request);
		return withLoginCookie(HttpStatus.CREATED, user);
	}

	/**
	 * Spring Security checks the password (BCrypt). Wrong email or password -> 401 with the SAME
	 * message for both, so nobody can find out which emails have accounts.
	 */
	@PostMapping("/login")
	public ResponseEntity<MeResponse> login(@Valid @RequestBody LoginRequest request) {
		String email = AuthService.normalizeEmail(request.email());
		authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
		return withLoginCookie(HttpStatus.OK, authService.findForToken(email));
	}

	/** Deletes the cookie. 204 No Content. */
	@PostMapping("/logout")
	public ResponseEntity<Void> logout() {
		return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.logout().toString()).build();
	}

	/** The logged-in user, or 204 No Content for a visitor (the app asks this when it starts). */
	@GetMapping("/me")
	public ResponseEntity<MeResponse> me(@AuthenticationPrincipal CurrentUser user) {
		if (user == null) {
			return ResponseEntity.noContent().build();
		}
		return ResponseEntity.ok(authService.me(user.id()));
	}

	private ResponseEntity<MeResponse> withLoginCookie(HttpStatus status, User user) {
		String token = jwtService.issue(user);
		return ResponseEntity.status(status)
			.header(HttpHeaders.SET_COOKIE, cookies.login(token, jwtService.expiry()).toString())
			.body(authService.toMe(user));
	}

}
