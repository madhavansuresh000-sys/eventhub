package com.eventhub.tag;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

/** Tag names for the filter chips, e.g. ["arts", "career", "coding", ...]. */
@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

	private final TagRepository tags;

	@GetMapping
	@Transactional(readOnly = true)
	public List<String> list() {
		return tags.findAll(Sort.by("name")).stream().map(Tag::getName).toList();
	}

}
