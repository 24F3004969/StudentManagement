package org.hilal.studentmanagement.repository;

import org.hilal.studentmanagement.entity.Subtopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubtopicRepository
        extends JpaRepository<Subtopic, String> {

    List<Subtopic>
    findByTopicIdOrderByDisplayOrderAsc(String topicId);

    Optional<Subtopic>
    findByTopicIdAndTitleIgnoreCase(
            String topicId,
            String title
    );

    boolean existsByTopicIdAndTitleIgnoreCase(
            String topicId,
            String title
    );

    boolean existsByTopicIdAndTitleIgnoreCaseAndIdNot(
            String topicId,
            String title,
            String id
    );

    Optional<Subtopic>
    findFirstByTopicIdOrderByDisplayOrderDesc(
            String topicId
    );

    long countByTopicId(String topicId);

    void deleteByTopicId(String topicId);
}