package com.eventhub.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Extra details about a user (One-to-One with User). */
@Entity
@Table(name = "profiles")
@Getter
@Setter
@NoArgsConstructor
public class Profile {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false, unique = true)
	private User user;

	@Column(length = 100)
	private String department;

	@Column(name = "year_of_study", columnDefinition = "TINYINT")
	private Integer yearOfStudy;

	@Column(length = 20)
	private String phone;

	@Column(length = 500)
	private String bio;

}
