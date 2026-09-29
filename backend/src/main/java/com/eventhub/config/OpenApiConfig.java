package com.eventhub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

/** Title and description shown at the top of Swagger UI (/swagger-ui.html). */
@Configuration
public class OpenApiConfig {

	@Bean
	OpenAPI eventHubOpenApi() {
		return new OpenAPI().info(new Info()
				.title("EventHub API")
				.version("0.8 (Phase 8)")
				.description("""
						College event platform: browse and search events, approval workflow
						(DRAFT -> PENDING_APPROVAL -> PUBLISHED), bookings with seat holds and payments,
						smart waitlist, notifications, QR gate check-in, PDF certificates, feedback and analytics.
						Login is a JWT in an httpOnly cookie (POST /api/auth/login); POST/PUT/DELETE also need
						the X-XSRF-TOKEN header. This page itself is for admins only."""));
	}

}
