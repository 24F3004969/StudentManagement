package org.hilal.studentmanagement.dto.test;

import java.math.BigDecimal;
import java.util.List;

public record StudentTestSummaryResponse(
        String studentId,
        int recordedTests,
        BigDecimal totalScore,
        BigDecimal totalMaximumScore,
        BigDecimal averagePercentage,
        int totalPoints,
        List<TestResultResponse> tests
) {
}