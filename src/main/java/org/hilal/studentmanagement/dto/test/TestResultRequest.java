package org.hilal.studentmanagement.dto.test;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TestResultRequest(

        @NotNull(message = "Test number is required")
        @Min(value = 1, message = "Test number must be at least 1")
        @Max(value = 3, message = "Test number cannot exceed 3")
        Integer testNumber,

        @DecimalMin(
                value = "0.0",
                message = "Score cannot be negative"
        )
        BigDecimal score,

        @DecimalMin(
                value = "0.01",
                message = "Maximum score must be greater than zero"
        )
        BigDecimal maximumScore,

        LocalDate testDate,

        @Size(
                max = 500,
                message = "Remark cannot exceed 500 characters"
        )
        String remark

) {
}
