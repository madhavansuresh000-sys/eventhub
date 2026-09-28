package com.eventhub.common;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/** One page of results plus page info, e.g. page 0 of 4 with 5 items each. */
public record PageResponse<T>(
		List<T> content,
		int page,
		int size,
		long totalElements,
		int totalPages,
		boolean last) {

	public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
		return new PageResponse<>(
				page.getContent().stream().map(mapper).toList(),
				page.getNumber(),
				page.getSize(),
				page.getTotalElements(),
				page.getTotalPages(),
				page.isLast());
	}

}
