package com.eventhub.common;

/** Thrown when something asked for does not exist (becomes HTTP 404 in Step 9). */
public class ResourceNotFoundException extends RuntimeException {

	public ResourceNotFoundException(String what, Object id) {
		super(what + " " + id + " not found");
	}

}
