package org.hilal.studentmanagement.dto.progress;

import java.time.Instant;
import java.util.List;

public record StudentProgressResponse(
        String studentId,
        String studentName,
        String edNo,
        String currentTopicId,
        String currentTopicTitle,
        int completedTopics,
        int totalTopics,
        int progressPercentage,
        boolean allTopicsCompleted,
        Instant lastActivityAt,
        List<TopicProgressResponse> topics
) {
}