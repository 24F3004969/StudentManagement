package org.hilal.studentmanagement.dto.topic;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record TopicPositionRequest(

        @NotNull(message = "Topic position is required")
        @Min(
                value = 1,
                message = "Topic position must be at least 1"
        )
        Integer position

) {
}
