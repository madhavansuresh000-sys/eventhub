package com.eventhub.payment;

/** The payment company could not be reached or said no (HTTP 502 Bad Gateway to our React app). */
public class PaymentProviderException extends RuntimeException {

	public PaymentProviderException(String message, Throwable cause) {
		super(message, cause);
	}

}
