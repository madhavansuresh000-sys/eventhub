package com.eventhub.notification;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.common.ResourceNotFoundException;
import com.eventhub.notification.dto.NotificationResponse;
import com.eventhub.notification.dto.NotificationsResponse;
import com.eventhub.user.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * The bell (and the emails behind it).
 *
 * create() is called INSIDE the transaction of the change it talks about (see NotificationTriggers),
 * so the message and the change are saved together or not at all. The email goes out after the commit
 * (EmailSender listens for EmailQueued).
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

	static final int BELL_SIZE = 20;

	private final NotificationRepository notifications;

	private final UserRepository users;

	private final ApplicationEventPublisher publisher;

	@Transactional
	public Notification create(Long userId, NotificationKind kind, String title, String body, String link, boolean email) {
		Notification n = new Notification();
		n.setUser(users.getReferenceById(userId));
		n.setKind(kind);
		n.setTitle(title);
		n.setBody(body);
		n.setLink(link);
		n.setEmailStatus(email ? EmailStatus.PENDING : EmailStatus.NONE);
		notifications.save(n);
		if (email) {
			publisher.publishEvent(new EmailQueued(n.getId())); // handled only AFTER the commit
		}
		return n;
	}

	@Transactional(readOnly = true)
	public NotificationsResponse mine(Long userId) {
		List<NotificationResponse> items = notifications
			.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, BELL_SIZE))
			.stream().map(NotificationResponse::from).toList();
		return new NotificationsResponse(notifications.countByUserIdAndReadAtIsNull(userId), items);
	}

	@Transactional
	public NotificationResponse markRead(Long userId, Long id) {
		Notification n = notifications.findByIdAndUserId(id, userId) // someone else's = 404
			.orElseThrow(() -> new ResourceNotFoundException("Notification", id));
		if (n.getReadAt() == null) {
			n.setReadAt(LocalDateTime.now());
		}
		return NotificationResponse.from(n);
	}

	@Transactional
	public int markAllRead(Long userId) {
		return notifications.markAllRead(userId, LocalDateTime.now());
	}

	/** "Notification X has an email to send" - published inside the transaction, handled after it. */
	public record EmailQueued(Long notificationId) {
	}

}
