package org.hilal.studentmanagement.service;

import org.hilal.studentmanagement.dto.test.StudentTestSummaryResponse;
import org.hilal.studentmanagement.dto.test.TestResultRequest;
import org.hilal.studentmanagement.dto.test.TestResultResponse;
import org.hilal.studentmanagement.entity.Student;
import org.hilal.studentmanagement.entity.TestResult;
import org.hilal.studentmanagement.entity.Topic;
import org.hilal.studentmanagement.exception.InvalidOperationException;
import org.hilal.studentmanagement.exception.ResourceNotFoundException;
import org.hilal.studentmanagement.repository.StudentRepository;
import org.hilal.studentmanagement.repository.TestResultRepository;
import org.hilal.studentmanagement.repository.TopicRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class TestResultService {

    private final StudentRepository studentRepository;
    private final TopicRepository topicRepository;
    private final TestResultRepository testResultRepository;

    public TestResultService(
            StudentRepository studentRepository,
            TopicRepository topicRepository,
            TestResultRepository testResultRepository
    ) {
        this.studentRepository = studentRepository;
        this.topicRepository = topicRepository;
        this.testResultRepository = testResultRepository;
    }

    public List<TestResultResponse> findByStudent(
            String studentId
    ) {
        getStudent(studentId);

        return testResultRepository
                .findByStudentIdOrderByTestDateAscTestNumberAsc(
                        studentId
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<TestResultResponse> findByStudentAndTopic(
            String studentId,
            String topicId
    ) {
        getStudent(studentId);
        getTopic(topicId);

        return testResultRepository
                .findByStudentIdAndTopicIdOrderByTestNumberAsc(
                        studentId,
                        topicId
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public StudentTestSummaryResponse getSummary(
            String studentId
    ) {
        getStudent(studentId);

        List<TestResult> results =
                testResultRepository
                        .findByStudentIdOrderByTestDateAscTestNumberAsc(
                                studentId
                        );

        BigDecimal totalScore = BigDecimal.ZERO;
        BigDecimal totalMaximum = BigDecimal.ZERO;
        int totalPoints = 0;
        int recordedTests = 0;

        for (TestResult result : results) {
            if (
                    result.getScore() != null &&
                            result.getMaximumScore() != null &&
                            result.getMaximumScore()
                                    .compareTo(BigDecimal.ZERO) > 0
            ) {
                totalScore = totalScore.add(
                        result.getScore()
                );

                totalMaximum = totalMaximum.add(
                        result.getMaximumScore()
                );

                recordedTests++;
            }

            totalPoints +=
                    result.getAwardedPoints() == null
                            ? 0
                            : result.getAwardedPoints();
        }

        BigDecimal averagePercentage = null;

        if (totalMaximum.compareTo(BigDecimal.ZERO) > 0) {
            averagePercentage = totalScore
                    .multiply(BigDecimal.valueOf(100))
                    .divide(
                            totalMaximum,
                            2,
                            RoundingMode.HALF_UP
                    );
        }

        return new StudentTestSummaryResponse(
                studentId,
                recordedTests,
                totalScore,
                totalMaximum,
                averagePercentage,
                totalPoints,
                results
                        .stream()
                        .map(this::toResponse)
                        .toList()
        );
    }

    @Transactional
    public TestResultResponse save(
            String studentId,
            String topicId,
            TestResultRequest request
    ) {
        Student student = getStudent(studentId);
        Topic topic = getTopic(topicId);

        validateMarks(
                request.score(),
                request.maximumScore()
        );

        TestResult result = testResultRepository
                .findByStudentIdAndTopicIdAndTestNumber(
                        studentId,
                        topicId,
                        request.testNumber()
                )
                .orElseGet(TestResult::new);

        result.setStudent(student);
        result.setTopic(topic);
        result.setTestNumber(request.testNumber());
        result.setScore(request.score());
        result.setMaximumScore(
                request.maximumScore()
        );
        result.setTestDate(request.testDate());
        result.setRemark(
                cleanOptional(request.remark())
        );

        result.setAwardedPoints(
                calculateAwardedPoints(
                        request.score(),
                        request.maximumScore()
                )
        );

        TestResult saved =
                testResultRepository.save(result);

        return toResponse(saved);
    }

    @Transactional
    public void delete(
            String studentId,
            String topicId,
            int testNumber
    ) {
        TestResult result = testResultRepository
                .findByStudentIdAndTopicIdAndTestNumber(
                        studentId,
                        topicId,
                        testNumber
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Test result was not found"
                        )
                );

        testResultRepository.delete(result);
    }

    private int calculateAwardedPoints(
            BigDecimal score,
            BigDecimal maximumScore
    ) {
        if (
                score == null ||
                        maximumScore == null ||
                        maximumScore.compareTo(BigDecimal.ZERO) <= 0
        ) {
            return 0;
        }

        BigDecimal percentage = score
                .multiply(BigDecimal.valueOf(100))
                .divide(
                        maximumScore,
                        4,
                        RoundingMode.HALF_UP
                );

        if (
                percentage.compareTo(
                        BigDecimal.valueOf(95)
                ) >= 0
        ) {
            return 200;
        }

        if (
                percentage.compareTo(
                        BigDecimal.valueOf(80)
                ) >= 0
        ) {
            return 100;
        }

        if (
                percentage.compareTo(
                        BigDecimal.valueOf(60)
                ) >= 0
        ) {
            return 50;
        }

        if (
                percentage.compareTo(
                        BigDecimal.valueOf(50)
                ) >= 0
        ) {
            return 25;
        }

        if (
                percentage.compareTo(
                        BigDecimal.valueOf(30)
                ) >= 0
        ) {
            return 10;
        }

        return -100;
    }

    private BigDecimal calculatePercentage(
            TestResult result
    ) {
        if (
                result.getScore() == null ||
                        result.getMaximumScore() == null ||
                        result.getMaximumScore()
                                .compareTo(BigDecimal.ZERO) <= 0
        ) {
            return null;
        }

        return result
                .getScore()
                .multiply(BigDecimal.valueOf(100))
                .divide(
                        result.getMaximumScore(),
                        2,
                        RoundingMode.HALF_UP
                );
    }

    private void validateMarks(
            BigDecimal score,
            BigDecimal maximumScore
    ) {
        if (score == null && maximumScore == null) {
            return;
        }

        if (score == null || maximumScore == null) {
            throw new InvalidOperationException(
                    "Score and maximum score must both be provided"
            );
        }

        if (score.compareTo(BigDecimal.ZERO) < 0) {
            throw new InvalidOperationException(
                    "Score cannot be negative"
            );
        }

        if (
                maximumScore.compareTo(BigDecimal.ZERO) <= 0
        ) {
            throw new InvalidOperationException(
                    "Maximum score must be greater than zero"
            );
        }

        if (score.compareTo(maximumScore) > 0) {
            throw new InvalidOperationException(
                    "Score cannot exceed maximum score"
            );
        }
    }

    private TestResultResponse toResponse(
            TestResult result
    ) {
        return new TestResultResponse(
                result.getId(),
                result.getStudent().getId(),
                result.getTopic().getId(),
                result.getTestNumber(),
                result.getScore(),
                result.getMaximumScore(),
                calculatePercentage(result),
                result.getTestDate(),
                result.getRemark(),
                result.getAwardedPoints(),
                result.getCreatedAt(),
                result.getUpdatedAt()
        );
    }

    private Student getStudent(String studentId) {
        return studentRepository
                .findById(studentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Student was not found: "
                                        + studentId
                        )
                );
    }

    private Topic getTopic(String topicId) {
        return topicRepository
                .findById(topicId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Topic was not found: "
                                        + topicId
                        )
                );
    }

    private String cleanOptional(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value.trim();

        return cleaned.isBlank() ? null : cleaned;
    }
}
