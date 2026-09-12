package org.hilal.studentmanagement.dto.note;

import java.time.Instant;

public record StudentNoteResponse(
        String studentId,
        String note,
        Instant updatedAt
) {
}