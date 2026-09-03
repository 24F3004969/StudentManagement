package org.hilal.studentmanagement.controller;

import java.util.Map;

import javax.sql.DataSource;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        try (var connection = dataSource.getConnection()) {
            boolean databaseAvailable =
                    connection.isValid(2);

            return ResponseEntity.ok(
                    Map.of(
                            "application", "GradeEd MathApp",
                            "status", "UP",
                            "database", databaseAvailable
                                    ? "UP"
                                    : "DOWN"
                    )
            );
        } catch (Exception exception) {
            return ResponseEntity
                    .internalServerError()
                    .body(
                            Map.of(
                                    "application", "GradeEd MathApp",
                                    "status", "DOWN",
                                    "database", "DOWN",
                                    "message", exception.getMessage()
                            )
                    );
        }
    }
}