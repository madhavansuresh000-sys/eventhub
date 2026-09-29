package com.eventhub.certificate;

import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.auth.CurrentUser;
import com.eventhub.certificate.CertificateService.Download;
import com.eventhub.certificate.dto.CertificateResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/certificates")
@RequiredArgsConstructor
public class CertificateController {

	private final CertificateService service;

	/** My certificates (login). Issues the ones earned since last time. */
	@GetMapping("/mine")
	public List<CertificateResponse> mine(@AuthenticationPrincipal CurrentUser user) {
		return service.mine(user.id());
	}

	/** Download the PDF (login, own certificate only). */
	@GetMapping(value = "/{number}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
	public ResponseEntity<byte[]> pdf(@AuthenticationPrincipal CurrentUser user, @PathVariable String number) {
		Download file = service.pdf(user.id(), number);
		return ResponseEntity.ok()
			.header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.fileName()).build().toString())
			.body(file.bytes());
	}

	/** PUBLIC (SecurityConfig): is this certificate number real? 404 = not an EventHub certificate. */
	@GetMapping("/verify/{number}")
	public CertificateResponse verify(@PathVariable String number) {
		return service.verify(number);
	}

}
