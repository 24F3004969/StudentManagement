package org.hilal.studentmanagement.service;

import org.hilal.studentmanagement.dto.student.StudentRequest;
import org.hilal.studentmanagement.dto.student.StudentResponse;
import org.hilal.studentmanagement.entity.ProgressStatus;
import org.hilal.studentmanagement.entity.Student;
import org.hilal.studentmanagement.entity.StudentTopicProgress;
import org.hilal.studentmanagement.entity.Topic;
import org.hilal.studentmanagement.exception.DuplicateResourceException;
import org.hilal.studentmanagement.exception.ResourceNotFoundException;
import org.hilal.studentmanagement.repository.StudentNoteRepository;
import org.hilal.studentmanagement.repository.StudentRepository;
import org.hilal.studentmanagement.repository.StudentSubtopicProgressRepository;
import org.hilal.studentmanagement.repository.StudentTopicProgressRepository;
import org.hilal.studentmanagement.repository.TestResultRepository;
import org.hilal.studentmanagement.repository.TopicRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class StudentService {

    private final StudentRepository studentRepository;
    private final TopicRepository topicRepository;

    private final StudentTopicProgressRepository
            studentTopicProgressRepository;

    private final StudentSubtopicProgressRepository
            studentSubtopicProgressRepository;

    private final TestResultRepository testResultRepository;
    private final StudentNoteRepository studentNoteRepository;

    public StudentService(
            StudentRepository studentRepository,
            TopicRepository topicRepository,
            StudentTopicProgressRepository
                    studentTopicProgressRepository,
            StudentSubtopicProgressRepository
                    studentSubtopicProgressRepository,
            TestResultRepository testResultRepository,
            StudentNoteRepository studentNoteRepository
    ) {
        this.studentRepository = studentRepository;
        this.topicRepository = topicRepository;
        this.studentTopicProgressRepository =
                studentTopicProgressRepository;
        this.studentSubtopicProgressRepository =
                studentSubtopicProgressRepository;
        this.testResultRepository = testResultRepository;
        this.studentNoteRepository = studentNoteRepository;
    }

    public List<StudentResponse> findAll() {
        return studentRepository
                .findAllByOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public StudentResponse findById(String studentId) {
        return toResponse(getStudent(studentId));
    }

    public List<StudentResponse> search(String query) {
        String cleanedQuery = cleanOptional(query);

        if (cleanedQuery == null) {
            return findAll();
        }

        return studentRepository
                .findByNameContainingIgnoreCaseOrEdNumberContainingIgnoreCaseOrderByNameAsc(
                        cleanedQuery,
                        cleanedQuery
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public StudentResponse create(
            StudentRequest request
    ) {
        String name = cleanRequired(request.name());
        String edNumber = cleanOptional(request.edNo());

        if (studentRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException(
                    "A student with this name already exists"
            );
        }

        validateUniqueEdNumber(edNumber, null);

        Student student = new Student();
        student.setName(name);
        student.setEdNumber(edNumber);
        student.setOverallPointBase(0L);
        student.setLastActivityAt(Instant.now());

        Student savedStudent =
                studentRepository.save(student);

        createInitialProgress(savedStudent);

        return toResponse(savedStudent);
    }

    @Transactional
    public StudentResponse update(
            String studentId,
            StudentRequest request
    ) {
        Student student = getStudent(studentId);

        String name = cleanRequired(request.name());
        String edNumber = cleanOptional(request.edNo());

        boolean duplicateName =
                studentRepository
                        .existsByNameIgnoreCaseAndIdNot(
                                name,
                                studentId
                        );

        if (duplicateName) {
            throw new DuplicateResourceException(
                    "A student with this name already exists"
            );
        }

        validateUniqueEdNumber(
                edNumber,
                studentId
        );

        student.setName(name);
        student.setEdNumber(edNumber);

        return toResponse(
                studentRepository.save(student)
        );
    }

    @Transactional
    public void delete(String studentId) {
        Student student = getStudent(studentId);

        testResultRepository.deleteByStudentId(studentId);
        studentNoteRepository.deleteByStudentId(studentId);

        studentSubtopicProgressRepository
                .deleteByStudentId(studentId);

        studentTopicProgressRepository
                .deleteByStudentId(studentId);

        studentRepository.delete(student);
    }

    private void createInitialProgress(Student student) {
        List<Topic> topics =
                topicRepository.findAllByOrderByDisplayOrderAsc();

        if (topics.isEmpty()) {
            return;
        }

        Topic firstTopic = topics.getFirst();

        StudentTopicProgress progress =
                new StudentTopicProgress();

        progress.setStudent(student);
        progress.setTopic(firstTopic);
        progress.setStatus(ProgressStatus.IN_PROGRESS);
        progress.setStartedAt(Instant.now());
        progress.setTimeSpentMinutes(0L);

        studentTopicProgressRepository.save(progress);
    }

    private void validateUniqueEdNumber(
            String edNumber,
            String excludedStudentId
    ) {
        if (edNumber == null) {
            return;
        }

        boolean duplicate;

        if (excludedStudentId == null) {
            duplicate =
                    studentRepository
                            .existsByEdNumberIgnoreCase(
                                    edNumber
                            );
        } else {
            duplicate =
                    studentRepository
                            .existsByEdNumberIgnoreCaseAndIdNot(
                                    edNumber,
                                    excludedStudentId
                            );
        }

        if (duplicate) {
            throw new DuplicateResourceException(
                    "This ED number belongs to another student"
            );
        }
    }

    private Student getStudent(String studentId) {
        return studentRepository
                .findById(studentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Student was not found: " + studentId
                        )
                );
    }

    private StudentResponse toResponse(Student student) {
        return new StudentResponse(
                student.getId(),
                student.getName(),
                student.getEdNumber(),
                student.getOverallPointBase(),
                student.getLastActivityAt(),
                student.getCreatedAt(),
                student.getUpdatedAt()
        );
    }
    @Transactional
    public StudentResponse updateOverallPointBase(
            String studentId,
            Long basePoints
    ) {
        Student student = getStudent(studentId);

        long points = basePoints == null
                ? 0L
                : Math.max(0L, basePoints);

        student.setOverallPointBase(points);

        return toResponse(
                studentRepository.save(student)
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

    private String cleanOptional(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value
                .trim()
                .replaceAll("\\s+", " ");

        return cleaned.isBlank() ? null : cleaned;
    }
}