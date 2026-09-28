package com.eventhub.common;

import java.util.Map;
import java.util.TreeMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Turns every error into clean JSON (RFC 9457 "problem details"), e.g.
 *
 * <pre>
 * { "status": 400, "title": "Bad Request", "detail": "Validation failed",
 *   "errors": { "title": "title is required" } }
 * </pre>
 *
 * The parent class already handles Spring's own errors (bad JSON, wrong HTTP method,
 * unknown URL ...) in the same format.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	/** @Valid failed: list every bad field and its message. */
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Map<String, String> errors = new TreeMap<>();
		ex.getBindingResult().getFieldErrors()
			.forEach(e -> errors.putIfAbsent(e.getField(), e.getDefaultMessage()));

		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
		problem.setProperty("errors", errors);
		return ResponseEntity.badRequest().body(problem);
	}

	/** A query value of the wrong type, e.g. page=abc or from=31-10-2026. */
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
				"Invalid value '" + ex.getValue() + "' for '" + ex.getName() + "'");
	}

	@ExceptionHandler(BadRequestException.class)
	ProblemDetail handleBadRequest(BadRequestException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
	}

	@ExceptionHandler(ResourceNotFoundException.class)
	ProblemDetail handleNotFound(ResourceNotFoundException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(BusinessRuleException.class)
	ProblemDetail handleBusinessRule(BusinessRuleException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
	}

	/** Two people saved the same event at the same moment (@Version). */
	@ExceptionHandler(ObjectOptimisticLockingFailureException.class)
	ProblemDetail handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
				"This record was changed by someone else. Please reload and try again.");
	}

	/** Anything unexpected: log the details, but never send the stack trace to the user. */
	@ExceptionHandler(Exception.class)
	ProblemDetail handleUnexpected(Exception ex) {
		log.error("Unexpected error", ex);
		return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
				"Something went wrong on our side. Please try again later.");
	}

}
