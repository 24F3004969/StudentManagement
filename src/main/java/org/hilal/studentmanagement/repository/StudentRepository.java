package org.hilal.studentmanagement.repository;

import org.hilal.studentmanagement.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentRepository
        extends JpaRepository<Student, String> {

    List<Student> findAllByOrderByNameAsc();

    Optional<Student> findByEdNumberIgnoreCase(
            String edNumber
    );

    Optional<Student> findByNameIgnoreCase(
            String name
    );

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(
            String name,
            String id
    );

    boolean existsByEdNumberIgnoreCase(
            String edNumber
    );

    boolean existsByEdNumberIgnoreCaseAndIdNot(
            String edNumber,
            String id
    );

    List<Student>
    findByNameContainingIgnoreCaseOrEdNumberContainingIgnoreCaseOrderByNameAsc(
            String name,
            String edNumber
    );
}