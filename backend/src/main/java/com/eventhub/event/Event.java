package com.eventhub.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.eventhub.club.Club;
import com.eventhub.tag.Tag;
import com.eventhub.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A college event, e.g. "Tech Fest 2026". */
@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
public class Event {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Many events belong to one club. */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "club_id", nullable = false)
	private Club club;

	/** The organizer who created it (empty for sample data). */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "created_by")
	private User createdBy;

	@Column(nullable = false, length = 150)
	private String title;

	@Column(columnDefinition = "TEXT")
	private String description;

	@Column(nullable = false, length = 150)
	private String venue;

	@Column(name = "start_time", nullable = false)
	private LocalDateTime startTime;

	@Column(name = "end_time", nullable = false)
	private LocalDateTime endTime;

	@Column(name = "total_seats", nullable = false)
	private int totalSeats;

	@Column(name = "available_seats", nullable = false)
	private int availableSeats;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal price = BigDecimal.ZERO;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EventStatus status = EventStatus.DRAFT;

	/** The admin's reason when an event is sent back to DRAFT. */
	@Column(name = "review_note", length = 500)
	private String reviewNote;

	/** Optimistic locking: stops two people saving over each other (and overselling). */
	@Version
	@Column(nullable = false)
	private int version;

	/** Many-to-Many: tags via the event_tags table. */
	@ManyToMany
	@JoinTable(name = "event_tags",
			joinColumns = @JoinColumn(name = "event_id"),
			inverseJoinColumns = @JoinColumn(name = "tag_id"))
	private Set<Tag> tags = new HashSet<>();

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

}
