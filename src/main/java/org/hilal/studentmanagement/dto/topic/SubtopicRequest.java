package org.hilal.studentmanagement.dto.topic;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubtopicRequest(

        @NotBlank(message = "Subtopic title is required")
        @Size(
                max = 160,
                message = "Subtopic title cannot exceed 160 characters"
        )
        String title

) {
}