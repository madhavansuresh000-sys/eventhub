package com.eventhub.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** What the Register form sends. Every new account is a STUDENT. */
public record RegisterRequest(
		@NotBlank(message = "fullName is required")
		@Size(min = 3, max = 100, message = "fullName must be 3 to 100 characters")
		String fullName,

		@NotBlank(message = "email is required")
		@Email(message = "email must be a valid email address")
		@Size(max = 150, message = "email must be at most 150 characters")
		String email,

		// BCrypt only uses the first 72 bytes, so longer passwords are not allowed
		@NotBlank(message = "password is required")
		@Size(min = 8, max = 72, message = "password must be 8 to 72 characters")
		@Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "password must contain a letter and a number")
		String password,

		@Size(max = 100, message = "department must be at most 100 characters")
		String department,

		@Min(value = 1, message = "yearOfStudy must be between 1 and 6")
		@Max(value = 6, message = "yearOfStudy must be between 1 and 6")
		Integer yearOfStudy) {
}
