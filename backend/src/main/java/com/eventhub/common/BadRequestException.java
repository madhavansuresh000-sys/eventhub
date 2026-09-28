package com.eventhub.common;

/** Thrown when a request option is invalid, e.g. an unknown sort field (becomes HTTP 400). */
public class BadRequestException extends RuntimeException {

	public BadRequestException(String message) {
		super(message);
	}

}
