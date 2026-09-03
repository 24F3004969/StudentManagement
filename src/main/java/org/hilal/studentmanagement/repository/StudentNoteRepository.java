package org.hilal.studentmanagement.repository;

import org.hilal.studentmanagement.entity.StudentNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StudentNoteRepository
        extends JpaRepository<StudentNote, String> {

    Optional<StudentNote> findByStudentId(
            String studentId
    );

    boolean existsByStudentId(String studentId);

    void deleteByStudentId(String studentId);
}