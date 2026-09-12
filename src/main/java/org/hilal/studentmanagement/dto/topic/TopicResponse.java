package org.hilal.studentmanagement.dto.topic;

import java.util.List;

public record TopicResponse(
        String id,
        String title,
        Integer displayOrder,
        Integer difficulty,
        List<SubtopicResponse> subtopics){}