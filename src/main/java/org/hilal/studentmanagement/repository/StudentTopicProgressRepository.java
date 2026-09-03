package org.hilal.studentmanagement.repository;

import org.hilal.studentmanagement.entity.ProgressStatus;
import org.hilal.studentmanagement.entity.StudentTopicProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentTopicProgressRepository
        extends JpaRepository<StudentTopicProgress, String> {

    Optional<StudentTopicProgress>
    findByStudentIdAndTopicId(
            String studentId,
            String topicId
    );

    List<StudentTopicProgress>
    findByStudentId(String studentId);

    List<StudentTopicProgress>
    findByStudentIdOrderByTopicDisplayOrderAsc(
            String studentId
    );

    List<StudentTopicProgress>
    findByTopicId(String topicId);

    List<StudentTopicProgress>
    findByTopicIdAndStatus(
            String topicId,
            ProgressStatus status
    );

    long countByStudentIdAndStatus(
            String studentId,
            ProgressStatus status
    );

    boolean existsByStudentIdAndTopicId(
            String studentId,
            String topicId
    );

    void deleteByStudentId(String studentId);

    void deleteByTopicId(String topicId);
}