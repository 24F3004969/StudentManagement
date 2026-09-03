package org.hilal.studentmanagement.service;

import org.hilal.studentmanagement.dto.topic.SubtopicRequest;
import org.hilal.studentmanagement.dto.topic.SubtopicResponse;
import org.hilal.studentmanagement.dto.topic.TopicRequest;
import org.hilal.studentmanagement.dto.topic.TopicResponse;
import org.hilal.studentmanagement.entity.Subtopic;
import org.hilal.studentmanagement.entity.Topic;
import org.hilal.studentmanagement.exception.DuplicateResourceException;
import org.hilal.studentmanagement.exception.InvalidOperationException;
import org.hilal.studentmanagement.exception.ResourceNotFoundException;
import org.hilal.studentmanagement.repository.StudentSubtopicProgressRepository;
import org.hilal.studentmanagement.repository.StudentTopicProgressRepository;
import org.hilal.studentmanagement.repository.SubtopicRepository;
import org.hilal.studentmanagement.repository.TestResultRepository;
import org.hilal.studentmanagement.repository.TopicRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class TopicService {

    private final TopicRepository topicRepository;
    private final SubtopicRepository subtopicRepository;

    private final StudentTopicProgressRepository
            studentTopicProgressRepository;

    private final StudentSubtopicProgressRepository
            studentSubtopicProgressRepository;

    private final TestResultRepository testResultRepository;

    public TopicService(
            TopicRepository topicRepository,
            SubtopicRepository subtopicRepository,
            StudentTopicProgressRepository
                    studentTopicProgressRepository,
            StudentSubtopicProgressRepository
                    studentSubtopicProgressRepository,
            TestResultRepository testResultRepository
    ) {
        this.topicRepository = topicRepository;
        this.subtopicRepository = subtopicRepository;
        this.studentTopicProgressRepository =
                studentTopicProgressRepository;
        this.studentSubtopicProgressRepository =
                studentSubtopicProgressRepository;
        this.testResultRepository = testResultRepository;
    }

    public List<TopicResponse> findAll() {
        return topicRepository
                .findAllByOrderByDisplayOrderAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public TopicResponse findById(String topicId) {
        return toResponse(getTopic(topicId));
    }

    @Transactional
    public TopicResponse create(TopicRequest request) {
        String title = cleanRequired(request.title());

        if (topicRepository.existsByTitleIgnoreCase(title)) {
            throw new DuplicateResourceException(
                    "A topic with this title already exists"
            );
        }

        int nextPosition = Math.toIntExact(
                topicRepository.count() + 1
        );

        int difficulty = request.difficulty() == null
                ? calculateDifficulty(nextPosition)
                : request.difficulty();

        Topic topic = new Topic();
        topic.setTitle(title);
        topic.setDisplayOrder(nextPosition);
        topic.setDifficulty(difficulty);

        Topic savedTopic = topicRepository.save(topic);

        return toResponse(savedTopic);
    }

    @Transactional
    public TopicResponse update(
            String topicId,
            TopicRequest request
    ) {
        Topic topic = getTopic(topicId);
        String title = cleanRequired(request.title());

        boolean duplicate =
                topicRepository
                        .existsByTitleIgnoreCaseAndIdNot(
                                title,
                                topicId
                        );

        if (duplicate) {
            throw new DuplicateResourceException(
                    "A topic with this title already exists"
            );
        }

        topic.setTitle(title);

        if (request.difficulty() != null) {
            topic.setDifficulty(request.difficulty());
        }

        return toResponse(topicRepository.save(topic));
    }

    @Transactional
    public TopicResponse move(
            String topicId,
            int requestedPosition
    ) {
        List<Topic> topics =
                topicRepository.findAllByOrderByDisplayOrderAsc();

        Topic movingTopic = topics
                .stream()
                .filter(topic -> topic.getId().equals(topicId))
                .findFirst()
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Topic was not found: " + topicId
                        )
                );

        if (
                requestedPosition < 1 ||
                        requestedPosition > topics.size()
        ) {
            throw new InvalidOperationException(
                    "Topic position must be between 1 and "
                            + topics.size()
            );
        }

        topics.remove(movingTopic);
        topics.add(requestedPosition - 1, movingTopic);

        for (int index = 0; index < topics.size(); index++) {
            topics
                    .get(index)
                    .setDisplayOrder(index + 1);
        }

        topicRepository.saveAll(topics);

        return toResponse(movingTopic);
    }

    @Transactional
    public void delete(String topicId) {
        Topic topic = getTopic(topicId);

        if (topicRepository.count() <= 1) {
            throw new InvalidOperationException(
                    "At least one topic is required"
            );
        }

        /*
         * Delete dependent records first because the
         * database foreign keys correctly prevent orphan data.
         */
        testResultRepository.deleteByTopicId(topicId);

        studentSubtopicProgressRepository
                .deleteBySubtopicTopicId(topicId);

        studentTopicProgressRepository
                .deleteByTopicId(topicId);

        subtopicRepository.deleteByTopicId(topicId);
        topicRepository.delete(topic);

        normalizeTopicPositions();
    }

    @Transactional
    public SubtopicResponse addSubtopic(
            String topicId,
            SubtopicRequest request
    ) {
        Topic topic = getTopic(topicId);
        String title = cleanRequired(request.title());

        boolean duplicate =
                subtopicRepository
                        .existsByTopicIdAndTitleIgnoreCase(
                                topicId,
                                title
                        );

        if (duplicate) {
            throw new DuplicateResourceException(
                    "This subtopic already exists in the topic"
            );
        }

        int nextPosition = Math.toIntExact(
                subtopicRepository.countByTopicId(topicId) + 1
        );

        Subtopic subtopic = new Subtopic();
        subtopic.setTopic(topic);
        subtopic.setTitle(title);
        subtopic.setDisplayOrder(nextPosition);

        return toSubtopicResponse(
                subtopicRepository.save(subtopic)
        );
    }

    @Transactional
    public SubtopicResponse updateSubtopic(
            String topicId,
            String subtopicId,
            SubtopicRequest request
    ) {
        Subtopic subtopic = getSubtopic(
                topicId,
                subtopicId
        );

        String title = cleanRequired(request.title());

        boolean duplicate =
                subtopicRepository
                        .existsByTopicIdAndTitleIgnoreCaseAndIdNot(
                                topicId,
                                title,
                                subtopicId
                        );

        if (duplicate) {
            throw new DuplicateResourceException(
                    "This subtopic already exists in the topic"
            );
        }

        subtopic.setTitle(title);

        return toSubtopicResponse(
                subtopicRepository.save(subtopic)
        );
    }

    @Transactional
    public void deleteSubtopic(
            String topicId,
            String subtopicId
    ) {
        Subtopic subtopic = getSubtopic(
                topicId,
                subtopicId
        );

        studentSubtopicProgressRepository
                .deleteBySubtopicId(subtopicId);

        subtopicRepository.delete(subtopic);

        normalizeSubtopicPositions(topicId);
    }

    private Topic getTopic(String topicId) {
        return topicRepository
                .findById(topicId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Topic was not found: " + topicId
                        )
                );
    }

    private Subtopic getSubtopic(
            String topicId,
            String subtopicId
    ) {
        Subtopic subtopic = subtopicRepository
                .findById(subtopicId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Subtopic was not found: " + subtopicId
                        )
                );

        if (
                !subtopic
                        .getTopic()
                        .getId()
                        .equals(topicId)
        ) {
            throw new ResourceNotFoundException(
                    "The subtopic does not belong to this topic"
            );
        }

        return subtopic;
    }

    private void normalizeTopicPositions() {
        List<Topic> topics =
                topicRepository.findAllByOrderByDisplayOrderAsc();

        for (int index = 0; index < topics.size(); index++) {
            topics
                    .get(index)
                    .setDisplayOrder(index + 1);
        }

        topicRepository.saveAll(topics);
    }

    private void normalizeSubtopicPositions(
            String topicId
    ) {
        List<Subtopic> subtopics =
                subtopicRepository
                        .findByTopicIdOrderByDisplayOrderAsc(
                                topicId
                        );

        for (
                int index = 0;
                index < subtopics.size();
                index++
        ) {
            subtopics
                    .get(index)
                    .setDisplayOrder(index + 1);
        }

        subtopicRepository.saveAll(subtopics);
    }

    private TopicResponse toResponse(Topic topic) {
        List<SubtopicResponse> subtopics =
                subtopicRepository
                        .findByTopicIdOrderByDisplayOrderAsc(
                                topic.getId()
                        )
                        .stream()
                        .map(this::toSubtopicResponse)
                        .toList();

        return new TopicResponse(
                topic.getId(),
                topic.getTitle(),
                topic.getDisplayOrder(),
                topic.getDifficulty(),
                subtopics
        );
    }

    private SubtopicResponse toSubtopicResponse(
            Subtopic subtopic
    ) {
        return new SubtopicResponse(
                subtopic.getId(),
                subtopic.getTitle(),
                subtopic.getDisplayOrder()
        );
    }

    private int calculateDifficulty(int position) {
        return Math.min(
                6,
                1 + Math.max(0, position - 1) / 10
        );
    }

    private String cleanRequired(String value) {
        if (value == null) {
            return "";
        }

        return value
                .trim()
                .replaceAll("\\s+", " ");
    }
}