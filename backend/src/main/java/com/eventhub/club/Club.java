package com.eventhub.club;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;

import com.eventhub.event.Event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A college club, e.g. Coding Club. One club runs many events. */
@Entity
@Table(name = "clubs")
@Getter
@Setter
@NoArgsConstructor
public class Club {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 100)
	private String name;

	@Column(nullable = false, unique = true, length = 100)
	private String slug;

	@Column(length = 1000)
	private String description;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	/** One-to-Many: the Event side owns the link (events.club_id). */
	@OneToMany(mappedBy = "club")
	private List<Event> events = new ArrayList<>();

}
