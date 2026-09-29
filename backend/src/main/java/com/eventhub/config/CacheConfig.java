package com.eventhub.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * Switches on @Cacheable. The cache is Caffeine (in memory); names and expiry time are in application.yml
 * (spring.cache.*). Used by the analytics dashboard (Phase 7 step 7).
 */
@Configuration
@EnableCaching
public class CacheConfig {
}
