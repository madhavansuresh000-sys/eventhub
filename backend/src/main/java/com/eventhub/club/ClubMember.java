package com.eventhub.club;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Links a user to a club with a club role (organizer, volunteer, member). */
@Entity
@Table(name = "club_members")
@Getter
@Setter
@NoArgsConstructor
public class ClubMember {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "club_id", nullable = false)
	private Club club;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(name = "club_role", nullable = false, length = 20)
	private ClubRole clubRole;

	@CreationTimestamp
	@Column(name = "joined_at", nullable = false, updatable = false)
	private LocalDateTime joinedAt;

}
