package com.eventhub;

import java.util.Map;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.testcontainers.mysql.MySQLContainer;

/**
 * Phase 8 step 2 - Testcontainers: the tests start their OWN MySQL 8.4 in Docker (same version as
 * docker-compose and production), fresh and empty; Flyway then builds the tables from V1..V9.
 *
 *   before: tests used the database "eventhub_test" inside our dev container - it had to be created
 *           by hand, leftovers from old runs stayed, and CI needed its own MySQL service.
 *   now:    `mvnw test` only needs Docker running. The container starts ONCE for the whole test run
 *           (about 10 s) and Testcontainers removes it when the run ends.
 *
 * Registered in src/test/resources/META-INF/spring.factories, so every Spring test context
 * (@SpringBootTest, @DataJpaTest ...) gets it without any change in the test classes.
 */
public class MySqlTestDatabase implements ApplicationContextInitializer<ConfigurableApplicationContext> {

	/** static = one container per test run, shared by every test context (like a singleton). */
	private static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
		.withDatabaseName("eventhub_test")
		.withUsername("eventhub")
		.withPassword("test-only-password");

	@Override
	public void initialize(ConfigurableApplicationContext context) {
		synchronized (MYSQL) {
			if (!MYSQL.isRunning()) {
				MYSQL.start();
			}
		}
		// addFirst = these win over application.yml (which points at the dev database)
		context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("testcontainers-mysql", Map.of(
				"spring.datasource.url", MYSQL.getJdbcUrl(),
				"spring.datasource.username", MYSQL.getUsername(),
				"spring.datasource.password", MYSQL.getPassword())));
	}

}
