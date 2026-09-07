package org.hilal.studentmanagement.dto.progress;

import java.time.Instant;

public record SubtopicProgressResponse(
        String subtopicId,
        String title,
        Integer displayOrder,
        boolean completed,
        Instant completedAt
) {
}