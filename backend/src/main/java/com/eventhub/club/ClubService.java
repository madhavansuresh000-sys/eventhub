package com.eventhub.club;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.club.dto.ClubResponse;
import com.eventhub.common.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClubService {

	private final ClubRepository clubs;

	@Transactional(readOnly = true)
	public List<ClubResponse> listClubs() {
		return clubs.findAll(Sort.by("name")).stream().map(ClubResponse::from).toList();
	}

	@Transactional(readOnly = true)
	public ClubResponse getBySlug(String slug) {
		return clubs.findBySlug(slug).map(ClubResponse::from)
			.orElseThrow(() -> new ResourceNotFoundException("Club", slug));
	}

}
