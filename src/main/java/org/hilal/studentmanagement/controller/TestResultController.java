package org.hilal.studentmanagement.controller;

import jakarta.validation.Valid;

import org.hilal.studentmanagement.dto.test.StudentTestSummaryResponse;
import org.hilal.studentmanagement.dto.test.TestResultRequest;
import org.hilal.studentmanagement.dto.test.TestResultResponse;
import org.hilal.studentmanagement.exception.InvalidOperationException;
import org.hilal.studentmanagement.service.TestResultService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/students/{studentId}")
public class TestResultController {

    private final TestResultService testResultService;

    public TestResultController(
            TestResultService testResultService
    ) {
        this.testResultService = testResultService;
    }

    @GetMapping("/tests")
    public ResponseEntity<List<TestResultResponse>>
    findAllTests(
            @PathVariable String studentId
    ) {
        return ResponseEntity.ok(
                testResultService.findByStudent(studentId)
        );
    }

    @GetMapping("/tests/summary")
    public ResponseEntity<StudentTestSummaryResponse>
    getSummary(
            @PathVariable String studentId
    ) {
        return ResponseEntity.ok(
                testResultService.getSummary(studentId)
        );
    }

    @GetMapping("/topics/{topicId}/tests")
    public ResponseEntity<List<TestResultResponse>>
    findTopicTests(
            @PathVariable String studentId,
            @PathVariable String topicId
    ) {
        return ResponseEntity.ok(
                testResultService.findByStudentAndTopic(
                        studentId,
                        topicId
                )
        );
    }

    @PutMapping(
            "/topics/{topicId}/tests/{testNumber}"
    )
    public ResponseEntity<TestResultResponse> save(
            @PathVariable String studentId,
            @PathVariable String topicId,
            @PathVariable Integer testNumber,
            @Valid @RequestBody TestResultRequest request
    ) {
        if (!testNumber.equals(request.testNumber())) {
            throw new InvalidOperationException(
                    "Path test number must match request test number"
            );
        }

        return ResponseEntity.ok(
                testResultService.save(
                        studentId,
                        topicId,
                        request
                )
        );
    }

    @DeleteMapping(
            "/topics/{topicId}/tests/{testNumber}"
    )
    public ResponseEntity<Void> delete(
            @PathVariable String studentId,
            @PathVariable String topicId,
            @PathVariable Integer testNumber
    ) {
        if (testNumber < 1 || testNumber > 3) {
            throw new InvalidOperationException(
                    "Test number must be between 1 and 3"
            );
        }

        testResultService.delete(
                studentId,
                topicId,
                testNumber
        );

        return ResponseEntity.noContent().build();
    }
}