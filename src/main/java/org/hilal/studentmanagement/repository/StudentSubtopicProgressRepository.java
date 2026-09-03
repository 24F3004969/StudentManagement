package org.hilal.studentmanagement.repository;

import org.hilal.studentmanagement.entity.StudentSubtopicProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentSubtopicProgressRepository
        extends JpaRepository<StudentSubtopicProgress, String> {

    Optional<StudentSubtopicProgress>
    findByStudentIdAndSubtopicId(
            String studentId,
            String subtopicId
    );

    List<StudentSubtopicProgress>
    findByStudentId(String studentId);

    List<StudentSubtopicProgress>
    findByStudentIdAndSubtopicTopicId(
            String studentId,
            String topicId
    );

    List<StudentSubtopicProgress>
    findByStudentIdAndSubtopicTopicIdOrderBySubtopicDisplayOrderAsc(
            String studentId,
            String topicId
    );

    long countByStudentIdAndSubtopicTopicIdAndCompletedTrue(
            String studentId,
            String topicId
    );

    boolean existsByStudentIdAndSubtopicId(
            String studentId,
            String subtopicId
    );

    void deleteByStudentId(String studentId);

    void deleteBySubtopicId(String subtopicId);

    void deleteBySubtopicTopicId(String topicId);
}