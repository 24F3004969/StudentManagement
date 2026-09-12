package org.hilal.studentmanagement.service;

import org.hilal.studentmanagement.dto.note.StudentNoteResponse;
import org.hilal.studentmanagement.entity.Student;
import org.hilal.studentmanagement.entity.StudentNote;
import org.hilal.studentmanagement.exception.ResourceNotFoundException;
import org.hilal.studentmanagement.repository.StudentNoteRepository;
import org.hilal.studentmanagement.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class StudentNoteService {

    private final StudentRepository studentRepository;
    private final StudentNoteRepository studentNoteRepository;

    public StudentNoteService(
            StudentRepository studentRepository,
            StudentNoteRepository studentNoteRepository
    ) {
        this.studentRepository = studentRepository;
        this.studentNoteRepository = studentNoteRepository;
    }

    public StudentNoteResponse findByStudent(
            String studentId
    ) {
        getStudent(studentId);

        return studentNoteRepository
                .findByStudentId(studentId)
                .map(this::toResponse)
                .orElse(
                        new StudentNoteResponse(
                                studentId,
                                "",
                                null
                        )
                );
    }

    @Transactional
    public StudentNoteResponse save(
            String studentId,
            String noteValue
    ) {
        Student student = getStudent(studentId);
        String cleanedNote = cleanOptional(noteValue);

        if (cleanedNote == null) {
            studentNoteRepository
                    .findByStudentId(studentId)
                    .ifPresent(
                            studentNoteRepository::delete
                    );

            return new StudentNoteResponse(
                    studentId,
                    "",
                    null
            );
        }

        StudentNote note = studentNoteRepository
                .findByStudentId(studentId)
                .orElseGet(() -> {
                    StudentNote created =
                            new StudentNote();

                    created.setStudent(student);

                    return created;
                });

        note.setNote(cleanedNote);

        StudentNote saved =
                studentNoteRepository.save(note);

        return toResponse(saved);
    }

    @Transactional
    public void delete(String studentId) {
        getStudent(studentId);

        studentNoteRepository
                .findByStudentId(studentId)
                .ifPresent(
                        studentNoteRepository::delete
                );
    }

    private StudentNoteResponse toResponse(
            StudentNote note
    ) {
        return new StudentNoteResponse(
                note.getStudent().getId(),
                note.getNote(),
                note.getUpdatedAt()
        );
    }

    private Student getStudent(String studentId) {
        return studentRepository
                .findById(studentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Student was not found: "
                                        + studentId
                        )
                );
    }

    private String cleanOptional(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value.trim();

        return cleaned.isBlank() ? null : cleaned;
    }
}
