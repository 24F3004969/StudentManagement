package org.hilal.studentmanagement.dto.test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record TestResultResponse(
        String id,
        String studentId,
        String topicId,
        Integer testNumber,
        BigDecimal score,
        BigDecimal maximumScore,
        BigDecimal percentage,
        LocalDate testDate,
        String remark,
        Integer awardedPoints,
        Instant createdAt,
        Instant updatedAt
) {
}