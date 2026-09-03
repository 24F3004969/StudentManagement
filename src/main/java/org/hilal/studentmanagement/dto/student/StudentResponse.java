package org.hilal.studentmanagement.dto.student;

import java.time.Instant;

public record StudentResponse(
        String id,
        String name,
        String edNo,
        Long overallPointBase,
        Instant lastActivityAt,
        Instant createdAt,
        Instant updatedAt
) {
}