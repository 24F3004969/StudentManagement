package org.hilal.studentmanagement.controller;

import jakarta.validation.Valid;

import org.hilal.studentmanagement.dto.progress.CompletionDateRequest;
import org.hilal.studentmanagement.dto.progress.StudentProgressResponse;
import org.hilal.studentmanagement.dto.progress.SubtopicCompletionRequest;
import org.hilal.studentmanagement.service.ProgressService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students/{studentId}/progress")
public class ProgressController {

    private final ProgressService progressService;

    public ProgressController(
            ProgressService progressService
    ) {
        this.progressService = progressService;
    }

    @GetMapping
    public ResponseEntity<StudentProgressResponse>
    getStudentProgress(
            @PathVariable String studentId
    ) {
        return ResponseEntity.ok(
                progressService.getStudentProgress(
                        studentId
                )
        );
    }

    @PutMapping(
            "/topics/{topicId}/subtopics/{subtopicId}"
    )
    public ResponseEntity<StudentProgressResponse>
    setSubtopicCompletion(
            @PathVariable String studentId,
            @PathVariable String topicId,
            @PathVariable String subtopicId,
            @Valid
            @RequestBody
            SubtopicCompletionRequest request
    ) {
        return ResponseEntity.ok(
                progressService.setSubtopicCompletion(
                        studentId,
                        topicId,
                        subtopicId,
                        request.completed()
                )
        );
    }

    @PostMapping(
            "/topics/{topicId}/complete-subtopics"
    )
    public ResponseEntity<StudentProgressResponse>
    markAllSubtopicsComplete(
            @PathVariable String studentId,
            @PathVariable String topicId
    ) {
        return ResponseEntity.ok(
                progressService.markAllSubtopicsComplete(
                        studentId,
                        topicId
                )
        );
    }

    @PostMapping("/topics/{topicId}/complete")
    public ResponseEntity<StudentProgressResponse>
    completeTopic(
            @PathVariable String studentId,
            @PathVariable String topicId
    ) {
        return ResponseEntity.ok(
                progressService.completeTopic(
                        studentId,
                        topicId
                )
        );
    }

    @PatchMapping(
            "/topics/{topicId}/completion-date"
    )
    public ResponseEntity<StudentProgressResponse>
    changeCompletionDate(
            @PathVariable String studentId,
            @PathVariable String topicId,
            @RequestBody CompletionDateRequest request
    ) {
        return ResponseEntity.ok(
                progressService.changeCompletionDate(
                        studentId,
                        topicId,
                        request.completedDate()
                )
        );
    }

    @PostMapping("/restart")
    public ResponseEntity<StudentProgressResponse>
    restartStudent(
            @PathVariable String studentId
    ) {
        return ResponseEntity.ok(
                progressService.restartStudent(
                        studentId
                )
        );
    }
}