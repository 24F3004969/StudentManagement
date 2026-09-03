package org.hilal.studentmanagement.repository;

import org.hilal.studentmanagement.entity.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TestResultRepository
        extends JpaRepository<TestResult, String> {

    List<TestResult>
    findByStudentIdOrderByTestDateAscTestNumberAsc(
            String studentId
    );

    List<TestResult>
    findByStudentIdAndTopicIdOrderByTestNumberAsc(
            String studentId,
            String topicId
    );

    Optional<TestResult>
    findByStudentIdAndTopicIdAndTestNumber(
            String studentId,
            String topicId,
            Integer testNumber
    );

    boolean existsByStudentIdAndTopicIdAndTestNumber(
            String studentId,
            String topicId,
            Integer testNumber
    );

    long countByStudentId(String studentId);

    void deleteByStudentId(String studentId);

    void deleteByTopicId(String topicId);

    void deleteByStudentIdAndTopicId(
            String studentId,
            String topicId
    );
}