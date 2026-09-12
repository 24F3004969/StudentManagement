package org.hilal.studentmanagement.controller;

import jakarta.validation.Valid;

import org.hilal.studentmanagement.dto.note.StudentNoteRequest;
import org.hilal.studentmanagement.dto.note.StudentNoteResponse;
import org.hilal.studentmanagement.service.StudentNoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students/{studentId}/note")
public class StudentNoteController {

    private final StudentNoteService studentNoteService;

    public StudentNoteController(
            StudentNoteService studentNoteService
    ) {
        this.studentNoteService = studentNoteService;
    }

    @GetMapping
    public ResponseEntity<StudentNoteResponse> find(
            @PathVariable String studentId
    ) {
        return ResponseEntity.ok(
                studentNoteService.findByStudent(studentId)
        );
    }

    @PutMapping
    public ResponseEntity<StudentNoteResponse> save(
            @PathVariable String studentId,
            @Valid @RequestBody StudentNoteRequest request
    ) {
        return ResponseEntity.ok(
                studentNoteService.save(
                        studentId,
                        request.note()
                )
        );
    }

    @DeleteMapping
    public ResponseEntity<Void> delete(
            @PathVariable String studentId
    ) {
        studentNoteService.delete(studentId);

        return ResponseEntity.noContent().build();
    }
}