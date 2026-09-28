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
				.version("0.2 (Phase 2)")
				.description("""
						College event platform: browse clubs and events, search and filter,
						and the approval workflow DRAFT -> PENDING_APPROVAL -> PUBLISHED.
						Create, update and approval URLs are open for testing until Phase 5 adds login."""));
	}

}
