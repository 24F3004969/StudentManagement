package org.hilal.studentmanagement.dto.student;


import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record OverallPointsRequest(

        @NotNull(message = "Base points are required")
        @Min(
                value = 0,
                message = "Base points cannot be negative"
        )
        Long basePoints

) {
}