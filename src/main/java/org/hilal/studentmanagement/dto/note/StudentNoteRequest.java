package org.hilal.studentmanagement.dto.note;

import jakarta.validation.constraints.Size;

public record StudentNoteRequest(

        @Size(
                max = 2000,
                message = "Student note cannot exceed 2000 characters"
        )
        String note

) {
}