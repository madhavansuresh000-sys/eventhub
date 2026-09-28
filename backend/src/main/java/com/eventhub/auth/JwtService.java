package com.eventhub.auth;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

/**
 * Makes and checks JWT login tokens.
 *
 * A JWT is like a stamped college ID card: anyone can READ what is written on it
 * (user id, name, roles, expiry), but only the server has the stamp (the secret key),
 * so nobody can change the card or make a fake one. Signed with HMAC-SHA256.
 */
@Service
public class JwtService {

	private static final String ISSUER = "eventhub";

	private final JwtEncoder encoder;

	private final JwtDecoder decoder;

	private final Duration expiry;

	public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.expiry}") Duration expiry) {
		byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
		if (bytes.length < 32) {
			throw new IllegalStateException("app.jwt.secret must be at least 32 characters (256 bits) long");
		}
		SecretKey key = new SecretKeySpec(bytes, "HmacSHA256");
		this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
		NimbusJwtDecoder nimbus = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
		// checks the signature, the expiry time and that we made it
		nimbus.setJwtValidator(JwtValidators.createDefaultWithIssuer(ISSUER));
		this.decoder = nimbus;
		this.expiry = expiry;
	}

	/** A new token for this user, valid for app.jwt.expiry (8 hours). */
	public String issue(User user) {
		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.issuer(ISSUER)
			.issuedAt(now)
			.expiresAt(now.plus(expiry))
			.subject(String.valueOf(user.getId()))
			.claim("email", user.getEmail())
			.claim("name", user.getFullName())
			.claim("roles", user.getRoles().stream().map(Role::getName).sorted().toList())
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	/** The token's contents if the signature is right and it has not expired; empty otherwise. */
	public Optional<Jwt> read(String token) {
		try {
			return Optional.of(decoder.decode(token));
		}
		catch (JwtException ex) {
			return Optional.empty();
		}
	}

	/** Role names inside a token, e.g. ["STUDENT"]. */
	public static List<String> roles(Jwt jwt) {
		List<String> roles = jwt.getClaimAsStringList("roles");
		return roles == null ? List.of() : roles;
	}

	public Duration expiry() {
		return expiry;
	}

}
