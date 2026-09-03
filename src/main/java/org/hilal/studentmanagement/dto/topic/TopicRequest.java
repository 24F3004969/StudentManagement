package org.hilal.studentmanagement.dto.topic;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TopicRequest(

        @NotBlank(message = "Topic title is required")
        @Size(
                max = 120,
                message = "Topic title cannot exceed 120 characters"
        )
        String title,

        @Min(
                value = 1,
                message = "Difficulty must be at least 1"
        )
        @Max(
                value = 6,
                message = "Difficulty cannot exceed 6"
        )
        Integer difficulty

) {
}