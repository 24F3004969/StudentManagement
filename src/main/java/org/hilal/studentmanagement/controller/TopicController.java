package org.hilal.studentmanagement.controller;

import jakarta.validation.Valid;

import org.hilal.studentmanagement.dto.topic.SubtopicRequest;
import org.hilal.studentmanagement.dto.topic.SubtopicResponse;
import org.hilal.studentmanagement.dto.topic.TopicPositionRequest;
import org.hilal.studentmanagement.dto.topic.TopicRequest;
import org.hilal.studentmanagement.dto.topic.TopicResponse;
import org.hilal.studentmanagement.service.TopicService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/topics")
public class TopicController {

    private final TopicService topicService;

    public TopicController(TopicService topicService) {
        this.topicService = topicService;
    }

    @GetMapping
    public ResponseEntity<List<TopicResponse>> findAll() {
        return ResponseEntity.ok(topicService.findAll());
    }

    @GetMapping("/{topicId}")
    public ResponseEntity<TopicResponse> findById(
            @PathVariable String topicId
    ) {
        return ResponseEntity.ok(
                topicService.findById(topicId)
        );
    }

    @PostMapping
    public ResponseEntity<TopicResponse> create(
            @Valid @RequestBody TopicRequest request
    ) {
        TopicResponse createdTopic =
                topicService.create(request);

        URI location = URI.create(
                "/api/topics/" + createdTopic.id()
        );

        return ResponseEntity
                .created(location)
                .body(createdTopic);
    }

    @PutMapping("/{topicId}")
    public ResponseEntity<TopicResponse> update(
            @PathVariable String topicId,
            @Valid @RequestBody TopicRequest request
    ) {
        return ResponseEntity.ok(
                topicService.update(topicId, request)
        );
    }

    @PatchMapping("/{topicId}/position")
    public ResponseEntity<TopicResponse> move(
            @PathVariable String topicId,
            @Valid
            @RequestBody TopicPositionRequest request
    ) {
        return ResponseEntity.ok(
                topicService.move(
                        topicId,
                        request.position()
                )
        );
    }

    @DeleteMapping("/{topicId}")
    public ResponseEntity<Void> delete(
            @PathVariable String topicId
    ) {
        topicService.delete(topicId);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{topicId}/subtopics")
    public ResponseEntity<SubtopicResponse> addSubtopic(
            @PathVariable String topicId,
            @Valid @RequestBody SubtopicRequest request
    ) {
        SubtopicResponse createdSubtopic =
                topicService.addSubtopic(
                        topicId,
                        request
                );

        URI location = URI.create(
                "/api/topics/"
                        + topicId
                        + "/subtopics/"
                        + createdSubtopic.id()
        );

        return ResponseEntity
                .created(location)
                .body(createdSubtopic);
    }

    @PutMapping(
            "/{topicId}/subtopics/{subtopicId}"
    )
    public ResponseEntity<SubtopicResponse> updateSubtopic(
            @PathVariable String topicId,
            @PathVariable String subtopicId,
            @Valid @RequestBody SubtopicRequest request
    ) {
        return ResponseEntity.ok(
                topicService.updateSubtopic(
                        topicId,
                        subtopicId,
                        request
                )
        );
    }

    @DeleteMapping(
            "/{topicId}/subtopics/{subtopicId}"
    )
    public ResponseEntity<Void> deleteSubtopic(
            @PathVariable String topicId,
            @PathVariable String subtopicId
    ) {
        topicService.deleteSubtopic(
                topicId,
                subtopicId
        );

        return ResponseEntity
                .status(HttpStatus.NO_CONTENT)
                .build();
    }
}