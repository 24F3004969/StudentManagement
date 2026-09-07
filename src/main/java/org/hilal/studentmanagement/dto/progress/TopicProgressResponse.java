package org.hilal.studentmanagement.dto.progress;

import org.hilal.studentmanagement.entity.ProgressStatus;

import java.time.Instant;
import java.util.List;

public record TopicProgressResponse(
        String topicId,
        String title,
        Integer displayOrder,
        Integer difficulty,
        ProgressStatus status,
        Instant startedAt,
        Instant completedAt,
        Long timeSpentMinutes,
        int completedSubtopics,
        int totalSubtopics,
        int progressPercentage,
        List<SubtopicProgressResponse> subtopics
) {
}