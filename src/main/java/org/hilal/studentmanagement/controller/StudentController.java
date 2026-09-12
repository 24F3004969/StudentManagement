package org.hilal.studentmanagement.controller;

import jakarta.validation.Valid;

import org.hilal.studentmanagement.dto.student.StudentRequest;
import org.hilal.studentmanagement.dto.student.StudentResponse;
import org.hilal.studentmanagement.service.StudentService;
import org.hilal.studentmanagement.dto.student.OverallPointsRequest;
import org.springframework.web.bind.annotation.PatchMapping;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentService studentService;

    public StudentController(
            StudentService studentService
    ) {
        this.studentService = studentService;
    }

    @GetMapping
    public ResponseEntity<List<StudentResponse>> findAll(
            @RequestParam(
                    name = "query",
                    required = false
            )
            String query
    ) {
        if (query == null || query.isBlank()) {
            return ResponseEntity.ok(
                    studentService.findAll()
            );
        }

        return ResponseEntity.ok(
                studentService.search(query)
        );
    }

    @GetMapping("/{studentId}")
    public ResponseEntity<StudentResponse> findById(
            @PathVariable String studentId
    ) {
        return ResponseEntity.ok(
                studentService.findById(studentId)
        );
    }

    @PostMapping
    public ResponseEntity<StudentResponse> create(
            @Valid @RequestBody StudentRequest request
    ) {
        StudentResponse createdStudent =
                studentService.create(request);

        URI location = URI.create(
                "/api/students/" + createdStudent.id()
        );

        return ResponseEntity
                .created(location)
                .body(createdStudent);
    }

    @PutMapping("/{studentId}")
    public ResponseEntity<StudentResponse> update(
            @PathVariable String studentId,
            @Valid @RequestBody StudentRequest request
    ) {
        return ResponseEntity.ok(
                studentService.update(
                        studentId,
                        request
                )
        );
    }

    @DeleteMapping("/{studentId}")
    public ResponseEntity<Void> delete(
            @PathVariable String studentId
    ) {
        studentService.delete(studentId);

        return ResponseEntity.noContent().build();
    }
    @PatchMapping("/{studentId}/overall-points")
    public ResponseEntity<StudentResponse>
    updateOverallPoints(
            @PathVariable String studentId,
            @Valid
            @RequestBody OverallPointsRequest request
    ) {
        return ResponseEntity.ok(
                studentService.updateOverallPointBase(
                        studentId,
                        request.basePoints()
                )
        );
    }
}