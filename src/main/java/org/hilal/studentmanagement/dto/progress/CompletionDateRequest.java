package org.hilal.studentmanagement.dto.progress;



import java.time.LocalDate;

public record CompletionDateRequest(
        LocalDate completedDate
) {
}