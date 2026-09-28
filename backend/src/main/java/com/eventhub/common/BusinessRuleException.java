package com.eventhub.common;

/** Thrown when a request breaks a business rule (becomes HTTP 409 in Step 9). */
public class BusinessRuleException extends RuntimeException {

	public BusinessRuleException(String message) {
		super(message);
	}

}
