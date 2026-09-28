package com.eventhub.club;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.club.dto.ClubResponse;

import lombok.RequiredArgsConstructor;

/** Club list for the filter dropdown, and one club by its slug. */
@RestController
@RequestMapping("/api/clubs")
@RequiredArgsConstructor
public class ClubController {

	private final ClubService service;

	@GetMapping
	public List<ClubResponse> list() {
		return service.listClubs();
	}

	@GetMapping("/{slug}")
	public ClubResponse get(@PathVariable String slug) {
		return service.getBySlug(slug);
	}

}
