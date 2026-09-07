package org.hilal.studentmanagement.service;

import org.hilal.studentmanagement.dto.progress.StudentProgressResponse;
import org.hilal.studentmanagement.dto.progress.SubtopicProgressResponse;
import org.hilal.studentmanagement.dto.progress.TopicProgressResponse;
import org.hilal.studentmanagement.entity.ProgressStatus;
import org.hilal.studentmanagement.entity.Student;
import org.hilal.studentmanagement.entity.StudentSubtopicProgress;
import org.hilal.studentmanagement.entity.StudentTopicProgress;
import org.hilal.studentmanagement.entity.Subtopic;
import org.hilal.studentmanagement.entity.Topic;
import org.hilal.studentmanagement.exception.InvalidOperationException;
import org.hilal.studentmanagement.exception.ResourceNotFoundException;
import org.hilal.studentmanagement.repository.StudentRepository;
import org.hilal.studentmanagement.repository.StudentSubtopicProgressRepository;
import org.hilal.studentmanagement.repository.StudentTopicProgressRepository;
import org.hilal.studentmanagement.repository.SubtopicRepository;
import org.hilal.studentmanagement.repository.TopicRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ProgressService {

    private final StudentRepository studentRepository;
    private final TopicRepository topicRepository;
    private final SubtopicRepository subtopicRepository;

    private final StudentTopicProgressRepository
            studentTopicProgressRepository;

    private final StudentSubtopicProgressRepository
            studentSubtopicProgressRepository;

    public ProgressService(
            StudentRepository studentRepository,
            TopicRepository topicRepository,
            SubtopicRepository subtopicRepository,
            StudentTopicProgressRepository
                    studentTopicProgressRepository,
            StudentSubtopicProgressRepository
                    studentSubtopicProgressRepository
    ) {
        this.studentRepository = studentRepository;
        this.topicRepository = topicRepository;
        this.subtopicRepository = subtopicRepository;
        this.studentTopicProgressRepository =
                studentTopicProgressRepository;
        this.studentSubtopicProgressRepository =
                studentSubtopicProgressRepository;
    }

    public StudentProgressResponse getStudentProgress(
            String studentId
    ) {
        Student student = getStudent(studentId);

        List<Topic> topics =
                topicRepository.findAllByOrderByDisplayOrderAsc();

        List<StudentTopicProgress> savedTopicProgress =
                studentTopicProgressRepository
                        .findByStudentIdOrderByTopicDisplayOrderAsc(
                                studentId
                        );

        Map<String, StudentTopicProgress> progressByTopicId =
                savedTopicProgress
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        progress ->
                                                progress
                                                        .getTopic()
                                                        .getId(),
                                        Function.identity()
                                )
                        );

        List<TopicProgressResponse> topicResponses =
                new ArrayList<>();

        String currentTopicId = null;
        String currentTopicTitle = null;
        int completedTopics = 0;

        for (Topic topic : topics) {
            StudentTopicProgress topicProgress =
                    progressByTopicId.get(topic.getId());

            ProgressStatus status =
                    topicProgress == null
                            ? ProgressStatus.NOT_STARTED
                            : topicProgress.getStatus();

            if (status == ProgressStatus.COMPLETED) {
                completedTopics++;
            }

            if (
                    currentTopicId == null &&
                            status == ProgressStatus.IN_PROGRESS
            ) {
                currentTopicId = topic.getId();
                currentTopicTitle = topic.getTitle();
            }

            topicResponses.add(
                    createTopicProgressResponse(
                            student,
                            topic,
                            topicProgress
                    )
            );
        }

        /*
         * Repair the current-topic response when older data
         * contains no explicit IN_PROGRESS row.
         */
        if (
                currentTopicId == null &&
                        completedTopics < topics.size()
        ) {
            for (TopicProgressResponse topic : topicResponses) {
                if (
                        topic.status() !=
                                ProgressStatus.COMPLETED
                ) {
                    currentTopicId = topic.topicId();
                    currentTopicTitle = topic.title();
                    break;
                }
            }
        }

        int totalTopics = topics.size();

        int percentage = totalTopics == 0
                ? 0
                : Math.round(
                completedTopics * 100f / totalTopics
        );

        boolean allCompleted =
                totalTopics > 0 &&
                        completedTopics == totalTopics;

        return new StudentProgressResponse(
                student.getId(),
                student.getName(),
                student.getEdNumber(),
                currentTopicId,
                currentTopicTitle,
                completedTopics,
                totalTopics,
                percentage,
                allCompleted,
                student.getLastActivityAt(),
                topicResponses
        );
    }

    @Transactional
    public StudentProgressResponse setSubtopicCompletion(
            String studentId,
            String topicId,
            String subtopicId,
            boolean completed
    ) {
        Student student = getStudent(studentId);
        Topic topic = getTopic(topicId);

        Subtopic subtopic = getSubtopic(
                topicId,
                subtopicId
        );

        Instant now = Instant.now();

        StudentTopicProgress topicProgress =
                getOrCreateTopicProgress(
                        student,
                        topic,
                        now
                );

        StudentSubtopicProgress subtopicProgress =
                studentSubtopicProgressRepository
                        .findByStudentIdAndSubtopicId(
                                studentId,
                                subtopicId
                        )
                        .orElseGet(() -> {
                            StudentSubtopicProgress created =
                                    new StudentSubtopicProgress();

                            created.setStudent(student);
                            created.setSubtopic(subtopic);
                            created.setCompleted(false);

                            return created;
                        });

        subtopicProgress.setCompleted(completed);

        subtopicProgress.setCompletedAt(
                completed ? now : null
        );

        studentSubtopicProgressRepository.save(
                subtopicProgress
        );

        student.setLastActivityAt(now);
        studentRepository.save(student);

        if (!completed) {
            reopenTopic(topicProgress, now);
        } else {
            completeTopicIfEligible(
                    student,
                    topic,
                    topicProgress,
                    now
            );
        }

        return getStudentProgress(studentId);
    }

    @Transactional
    public StudentProgressResponse markAllSubtopicsComplete(
            String studentId,
            String topicId
    ) {
        Student student = getStudent(studentId);
        Topic topic = getTopic(topicId);

        List<Subtopic> subtopics =
                subtopicRepository
                        .findByTopicIdOrderByDisplayOrderAsc(
                                topicId
                        );

        if (subtopics.isEmpty()) {
            throw new InvalidOperationException(
                    "This topic does not contain subtopics"
            );
        }

        Instant now = Instant.now();

        for (Subtopic subtopic : subtopics) {
            StudentSubtopicProgress progress =
                    studentSubtopicProgressRepository
                            .findByStudentIdAndSubtopicId(
                                    studentId,
                                    subtopic.getId()
                            )
                            .orElseGet(() -> {
                                StudentSubtopicProgress created =
                                        new StudentSubtopicProgress();

                                created.setStudent(student);
                                created.setSubtopic(subtopic);

                                return created;
                            });

            progress.setCompleted(true);
            progress.setCompletedAt(now);

            studentSubtopicProgressRepository.save(
                    progress
            );
        }

        StudentTopicProgress topicProgress =
                getOrCreateTopicProgress(
                        student,
                        topic,
                        now
                );

        completeTopic(
                student,
                topic,
                topicProgress,
                now
        );

        return getStudentProgress(studentId);
    }

    @Transactional
    public StudentProgressResponse completeTopic(
            String studentId,
            String topicId
    ) {
        Student student = getStudent(studentId);
        Topic topic = getTopic(topicId);

        List<Subtopic> subtopics =
                subtopicRepository
                        .findByTopicIdOrderByDisplayOrderAsc(
                                topicId
                        );

        if (!subtopics.isEmpty()) {
            long completedCount =
                    studentSubtopicProgressRepository
                            .countByStudentIdAndSubtopicTopicIdAndCompletedTrue(
                                    studentId,
                                    topicId
                            );

            if (completedCount < subtopics.size()) {
                throw new InvalidOperationException(
                        "All subtopics must be completed first"
                );
            }
        }

        Instant now = Instant.now();

        StudentTopicProgress topicProgress =
                getOrCreateTopicProgress(
                        student,
                        topic,
                        now
                );

        completeTopic(
                student,
                topic,
                topicProgress,
                now
        );

        return getStudentProgress(studentId);
    }

    @Transactional
    public StudentProgressResponse changeCompletionDate(
            String studentId,
            String topicId,
            LocalDate completedDate
    ) {
        Student student = getStudent(studentId);
        Topic topic = getTopic(topicId);

        StudentTopicProgress progress =
                studentTopicProgressRepository
                        .findByStudentIdAndTopicId(
                                studentId,
                                topicId
                        )
                        .orElseThrow(() ->
                                new InvalidOperationException(
                                        "The topic has no progress record"
                                )
                        );

        if (
                progress.getStatus() !=
                        ProgressStatus.COMPLETED
        ) {
            throw new InvalidOperationException(
                    "Only completed topics can have a completion date"
            );
        }

        if (completedDate == null) {
            progress.setCompletedAt(null);
        } else {
            Instant timestamp =
                    completedDate
                            .atTime(12, 0)
                            .atZone(ZoneId.systemDefault())
                            .toInstant();

            progress.setCompletedAt(timestamp);
        }

        studentTopicProgressRepository.save(progress);

        student.setLastActivityAt(Instant.now());
        studentRepository.save(student);

        return getStudentProgress(studentId);
    }

    @Transactional
    public StudentProgressResponse restartStudent(
            String studentId
    ) {
        Student student = getStudent(studentId);

        /*
         * Test results and teacher notes are deliberately retained.
         */
        studentSubtopicProgressRepository
                .deleteByStudentId(studentId);

        studentTopicProgressRepository
                .deleteByStudentId(studentId);

        List<Topic> topics =
                topicRepository.findAllByOrderByDisplayOrderAsc();

        Instant now = Instant.now();

        if (!topics.isEmpty()) {
            StudentTopicProgress firstProgress =
                    new StudentTopicProgress();

            firstProgress.setStudent(student);
            firstProgress.setTopic(topics.get(0));
            firstProgress.setStatus(
                    ProgressStatus.IN_PROGRESS
            );
            firstProgress.setStartedAt(now);
            firstProgress.setCompletedAt(null);
            firstProgress.setTimeSpentMinutes(0L);

            studentTopicProgressRepository.save(
                    firstProgress
            );
        }

        student.setLastActivityAt(now);
        studentRepository.save(student);

        return getStudentProgress(studentId);
    }

    private void completeTopicIfEligible(
            Student student,
            Topic topic,
            StudentTopicProgress topicProgress,
            Instant now
    ) {
        long totalSubtopics =
                subtopicRepository.countByTopicId(
                        topic.getId()
                );

        if (totalSubtopics == 0) {
            return;
        }

        long completedSubtopics =
                studentSubtopicProgressRepository
                        .countByStudentIdAndSubtopicTopicIdAndCompletedTrue(
                                student.getId(),
                                topic.getId()
                        );

        if (completedSubtopics == totalSubtopics) {
            completeTopic(
                    student,
                    topic,
                    topicProgress,
                    now
            );
        }
    }

    private void completeTopic(
            Student student,
            Topic topic,
            StudentTopicProgress topicProgress,
            Instant now
    ) {
        if (
                topicProgress.getStatus() !=
                        ProgressStatus.COMPLETED
        ) {
            long additionalMinutes =
                    calculateElapsedMinutes(
                            topicProgress.getStartedAt(),
                            now
                    );

            long previousMinutes =
                    topicProgress.getTimeSpentMinutes() == null
                            ? 0L
                            : topicProgress.getTimeSpentMinutes();

            topicProgress.setTimeSpentMinutes(
                    previousMinutes + additionalMinutes
            );
        }

        topicProgress.setStatus(
                ProgressStatus.COMPLETED
        );

        if (topicProgress.getStartedAt() == null) {
            topicProgress.setStartedAt(now);
        }

        topicProgress.setCompletedAt(now);

        studentTopicProgressRepository.save(
                topicProgress
        );

        student.setLastActivityAt(now);
        studentRepository.save(student);

        activateNextTopic(student, topic, now);
    }

    private void activateNextTopic(
            Student student,
            Topic completedTopic,
            Instant now
    ) {
        Topic nextTopic = topicRepository
                .findFirstByDisplayOrderGreaterThanOrderByDisplayOrderAsc(
                        completedTopic.getDisplayOrder()
                )
                .orElse(null);

        if (nextTopic == null) {
            return;
        }

        StudentTopicProgress nextProgress =
                studentTopicProgressRepository
                        .findByStudentIdAndTopicId(
                                student.getId(),
                                nextTopic.getId()
                        )
                        .orElseGet(() -> {
                            StudentTopicProgress created =
                                    new StudentTopicProgress();

                            created.setStudent(student);
                            created.setTopic(nextTopic);
                            created.setTimeSpentMinutes(0L);

                            return created;
                        });

        if (
                nextProgress.getStatus() !=
                        ProgressStatus.COMPLETED
        ) {
            nextProgress.setStatus(
                    ProgressStatus.IN_PROGRESS
            );

            if (nextProgress.getStartedAt() == null) {
                nextProgress.setStartedAt(now);
            }

            studentTopicProgressRepository.save(
                    nextProgress
            );
        }
    }

    private void reopenTopic(
            StudentTopicProgress progress,
            Instant now
    ) {
        progress.setStatus(
                ProgressStatus.IN_PROGRESS
        );

        progress.setCompletedAt(null);

        if (progress.getStartedAt() == null) {
            progress.setStartedAt(now);
        }

        studentTopicProgressRepository.save(progress);
    }

    private StudentTopicProgress getOrCreateTopicProgress(
            Student student,
            Topic topic,
            Instant now
    ) {
        return studentTopicProgressRepository
                .findByStudentIdAndTopicId(
                        student.getId(),
                        topic.getId()
                )
                .orElseGet(() -> {
                    StudentTopicProgress progress =
                            new StudentTopicProgress();

                    progress.setStudent(student);
                    progress.setTopic(topic);
                    progress.setStatus(
                            ProgressStatus.IN_PROGRESS
                    );
                    progress.setStartedAt(now);
                    progress.setTimeSpentMinutes(0L);

                    return studentTopicProgressRepository
                            .save(progress);
                });
    }

    private TopicProgressResponse
    createTopicProgressResponse(
            Student student,
            Topic topic,
            StudentTopicProgress topicProgress
    ) {
        List<Subtopic> subtopics =
                subtopicRepository
                        .findByTopicIdOrderByDisplayOrderAsc(
                                topic.getId()
                        );

        List<StudentSubtopicProgress> savedProgress =
                studentSubtopicProgressRepository
                        .findByStudentIdAndSubtopicTopicIdOrderBySubtopicDisplayOrderAsc(
                                student.getId(),
                                topic.getId()
                        );

        Map<String, StudentSubtopicProgress>
                savedProgressBySubtopicId =
                savedProgress
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        progress ->
                                                progress
                                                        .getSubtopic()
                                                        .getId(),
                                        Function.identity()
                                )
                        );

        List<SubtopicProgressResponse>
                subtopicResponses = new ArrayList<>();

        int completedSubtopics = 0;

        for (Subtopic subtopic : subtopics) {
            StudentSubtopicProgress progress =
                    savedProgressBySubtopicId.get(
                            subtopic.getId()
                    );

            boolean completed =
                    progress != null &&
                            progress.isCompleted();

            if (completed) {
                completedSubtopics++;
            }

            subtopicResponses.add(
                    new SubtopicProgressResponse(
                            subtopic.getId(),
                            subtopic.getTitle(),
                            subtopic.getDisplayOrder(),
                            completed,
                            progress == null
                                    ? null
                                    : progress.getCompletedAt()
                    )
            );
        }

        int totalSubtopics = subtopics.size();

        ProgressStatus status =
                topicProgress == null
                        ? ProgressStatus.NOT_STARTED
                        : topicProgress.getStatus();

        int percentage;

        if (totalSubtopics > 0) {
            percentage = Math.round(
                    completedSubtopics *
                            100f /
                            totalSubtopics
            );
        } else {
            percentage =
                    status == ProgressStatus.COMPLETED
                            ? 100
                            : 0;
        }

        return new TopicProgressResponse(
                topic.getId(),
                topic.getTitle(),
                topic.getDisplayOrder(),
                topic.getDifficulty(),
                status,
                topicProgress == null
                        ? null
                        : topicProgress.getStartedAt(),
                topicProgress == null
                        ? null
                        : topicProgress.getCompletedAt(),
                topicProgress == null ||
                        topicProgress.getTimeSpentMinutes() == null
                        ? 0L
                        : topicProgress.getTimeSpentMinutes(),
                completedSubtopics,
                totalSubtopics,
                percentage,
                subtopicResponses
        );
    }

    private long calculateElapsedMinutes(
            Instant startedAt,
            Instant completedAt
    ) {
        if (
                startedAt == null ||
                        completedAt == null ||
                        completedAt.isBefore(startedAt)
        ) {
            return 0L;
        }

        return Math.max(
                0L,
                Duration
                        .between(startedAt, completedAt)
                        .toMinutes()
        );
    }

    private Student getStudent(String studentId) {
        return studentRepository
                .findById(studentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Student was not found: " +
                                        studentId
                        )
                );
    }

    private Topic getTopic(String topicId) {
        return topicRepository
                .findById(topicId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Topic was not found: " +
                                        topicId
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
                                "Subtopic was not found: " +
                                        subtopicId
                        )
                );

        if (
                !subtopic
                        .getTopic()
                        .getId()
                        .equals(topicId)
        ) {
            throw new ResourceNotFoundException(
                    "The subtopic does not belong to the topic"
            );
        }

        return subtopic;
    }
}