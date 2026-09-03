package org.hilal.studentmanagement.repository;

import org.hilal.studentmanagement.entity.Topic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TopicRepository
        extends JpaRepository<Topic, String> {

    List<Topic> findAllByOrderByDisplayOrderAsc();

    Optional<Topic> findByTitleIgnoreCase(String title);

    boolean existsByTitleIgnoreCase(String title);

    boolean existsByTitleIgnoreCaseAndIdNot(
            String title,
            String id
    );

    Optional<Topic> findFirstByOrderByDisplayOrderDesc();
}