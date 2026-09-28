package com.eventhub.audit;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One line of the audit log. Plain ids (not @ManyToOne links) on purpose: an entry is a record
 * of what happened, and it must still make sense if the user or event is deleted later.
 */
@Entity
@Table(name = "audit_log")
@Getter
@Setter
@NoArgsConstructor
public class AuditEntry {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id")
	private Long userId;

	@Column(name = "user_name", length = 100)
	private String userName;

	@Column(name = "user_email", length = 150)
	private String userEmail;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private AuditAction action;

	@Column(name = "event_id")
	private Long eventId;

	@Column(name = "event_title", nullable = false, length = 150)
	private String eventTitle;

	@Column(length = 500)
	private String details;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

}
