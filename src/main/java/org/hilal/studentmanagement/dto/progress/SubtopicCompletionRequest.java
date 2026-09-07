package org.hilal.studentmanagement.dto.progress;



import jakarta.validation.constraints.NotNull;

public record SubtopicCompletionRequest(

        @NotNull(message = "Completed value is required")
        Boolean completed

) {
}