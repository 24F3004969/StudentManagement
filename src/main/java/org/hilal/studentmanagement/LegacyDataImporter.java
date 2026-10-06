/*
package org.hilal.studentmanagement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

@Component
public class LegacyDataImporter implements CommandLineRunner {

    */
/*
     * Change this to false after the import completes successfully.
     *//*

    private static final boolean IMPORT_ENABLED = true;

    */
/*
     * JSON file location:
     * src/main/resources/data/legacy-data.json
     *//*

    private static final String JSON_FILE = "math-progress-backup.json";

    private final JdbcTemplate jdbcTemplate;

    */
/*
     * Constructed directly because this importer only needs basic JSON reading.
     * This avoids requiring a Spring-managed ObjectMapper bean.
     *//*

    private final ObjectMapper objectMapper = new ObjectMapper();

    */
/*
     * Key:
     * topicId:subtopicIndex
     *
     * Value:
     * generated subtopic ID
     *//*

    private final Map<String, String> subtopicIds = new HashMap<>();

    public LegacyDataImporter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (!IMPORT_ENABLED) {
            System.out.println("Legacy data import is disabled.");
            return;
        }

        ClassPathResource resource = new ClassPathResource(JSON_FILE);

        if (!resource.exists()) {
            throw new IllegalStateException(
                    "Legacy JSON file was not found at: "
                            + JSON_FILE
                            + System.lineSeparator()
                            + "Place the file at:"
                            + System.lineSeparator()
                            + "src/main/resources/"
                            + JSON_FILE
            );
        }

        System.out.println("Starting legacy JSON data import...");

        try (InputStream inputStream = resource.getInputStream()) {
            JsonNode root = objectMapper.readTree(inputStream);

            if (root == null || !root.isObject()) {
                throw new IllegalStateException(
                        "The legacy JSON root must be a JSON object."
                );
            }

            Instant importedAt = parseInstant(
                    textOrNull(root.get("exportedAt"))
            );

            if (importedAt == null) {
                importedAt = Instant.now();
            }

            */
/*
             * Parent records must be imported before child records
             * because the database has foreign-key constraints.
             *//*

            int topicCount = importTopics(
                    root.path("topics"),
                    importedAt
            );

            int studentCount = importStudents(
                    root.path("students"),
                    root.path("lastActivity"),
                    importedAt
            );

            int topicProgressCount = importTopicProgress(
                    root,
                    importedAt
            );

            int subtopicProgressCount = importSubtopicProgress(
                    root,
                    importedAt
            );

            int testResultCount = importTestResults(
                    root.path("testScores"),
                    importedAt
            );

            int studentNoteCount = importStudentNotes(
                    root.path("studentNotes"),
                    importedAt
            );

            updateStudentOverallPointBase(root);
            updateStudentLastActivity(root);

            System.out.println();
            System.out.println("Legacy data import completed successfully.");
            System.out.println("Topics imported or updated: "
                    + topicCount);
            System.out.println("Subtopics imported or updated: "
                    + subtopicIds.size());
            System.out.println("Students imported or updated: "
                    + studentCount);
            System.out.println("Topic progress records imported or updated: "
                    + topicProgressCount);
            System.out.println(
                    "Subtopic progress records imported or updated: "
                            + subtopicProgressCount
            );
            System.out.println("Test results imported or updated: "
                    + testResultCount);
            System.out.println("Student notes imported or updated: "
                    + studentNoteCount);
            System.out.println();
            System.out.println(
                    "Set IMPORT_ENABLED to false after verifying the data."
            );
        }
    }

    */
/*
     * ============================================================
     * TOPICS AND SUBTOPICS
     * ============================================================
     *//*


    private int importTopics(
            JsonNode topics,
            Instant importedAt
    ) {
        if (!topics.isArray()) {
            System.out.println(
                    "No topics array was found in the JSON."
            );
            return 0;
        }

        int importedTopics = 0;
        int topicDisplayOrder = 1;

        for (JsonNode topic : topics) {
            String topicId = textOrNull(topic.get("id"));
            String title = textOrNull(topic.get("title"));
            int difficulty = intOrDefault(
                    topic.get("difficulty"),
                    1
            );

            if (isBlank(topicId)) {
                System.err.println(
                        "Skipped a topic because its ID was missing."
                );
                continue;
            }

            if (isBlank(title)) {
                System.err.println(
                        "Skipped topic " + topicId
                                + " because its title was missing."
                );
                continue;
            }

            jdbcTemplate.update("""
                    INSERT INTO public.topics (
                        id,
                        created_at,
                        difficulty,
                        display_order,
                        title,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT (id)
                    DO UPDATE SET
                        difficulty = EXCLUDED.difficulty,
                        display_order = EXCLUDED.display_order,
                        title = EXCLUDED.title,
                        updated_at = EXCLUDED.updated_at
                    """,
                    topicId,
                    Timestamp.from(importedAt),
                    difficulty,
                    topicDisplayOrder,
                    title,
                    Timestamp.from(importedAt)
            );

            importedTopics++;

            importSubtopics(
                    topicId,
                    topic.path("subs"),
                    importedAt
            );

            topicDisplayOrder++;
        }

        return importedTopics;
    }

    private void importSubtopics(
            String topicId,
            JsonNode subtopics,
            Instant importedAt
    ) {
        if (!subtopics.isArray()) {
            return;
        }

        int displayOrder = 1;

        for (int index = 0; index < subtopics.size(); index++) {
            String title = textOrNull(subtopics.get(index));

            if (isBlank(title)) {
                continue;
            }

            String subtopicId = generateSubtopicId(
                    topicId,
                    index,
                    title
            );

            subtopicIds.put(
                    createSubtopicMapKey(topicId, index),
                    subtopicId
            );

            jdbcTemplate.update("""
                    INSERT INTO public.subtopics (
                        id,
                        created_at,
                        display_order,
                        title,
                        updated_at,
                        topic_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT (id)
                    DO UPDATE SET
                        display_order = EXCLUDED.display_order,
                        title = EXCLUDED.title,
                        updated_at = EXCLUDED.updated_at,
                        topic_id = EXCLUDED.topic_id
                    """,
                    subtopicId,
                    Timestamp.from(importedAt),
                    displayOrder,
                    title,
                    Timestamp.from(importedAt),
                    topicId
            );

            displayOrder++;
        }
    }

    */
/*
     * ============================================================
     * STUDENTS
     * ============================================================
     *//*


    private int importStudents(
            JsonNode students,
            JsonNode lastActivity,
            Instant importedAt
    ) {
        if (!students.isArray()) {
            System.out.println(
                    "No students array was found in the JSON."
            );
            return 0;
        }

        int importedStudents = 0;

        for (JsonNode student : students) {
            String studentId = textOrNull(student.get("id"));
            String name = textOrNull(student.get("name"));
            String edNumber = blankToNull(
                    textOrNull(student.get("edNo"))
            );

            if (isBlank(studentId)) {
                System.err.println(
                        "Skipped a student because the ID was missing."
                );
                continue;
            }

            if (isBlank(name)) {
                System.err.println(
                        "Skipped student " + studentId
                                + " because the name was missing."
                );
                continue;
            }

            Instant activityTime = extractStudentTimestamp(
                    lastActivity,
                    studentId
            );

            jdbcTemplate.update("""
                    INSERT INTO public.students (
                        id,
                        created_at,
                        ed_number,
                        last_activity_at,
                        name,
                        overall_point_base,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (id)
                    DO UPDATE SET
                        ed_number = EXCLUDED.ed_number,
                        last_activity_at = COALESCE(
                            EXCLUDED.last_activity_at,
                            public.students.last_activity_at
                        ),
                        name = EXCLUDED.name,
                        updated_at = EXCLUDED.updated_at
                    """,
                    studentId,
                    Timestamp.from(importedAt),
                    edNumber,
                    toTimestamp(activityTime),
                    name,
                    0L,
                    Timestamp.from(importedAt)
            );

            importedStudents++;
        }

        return importedStudents;
    }

    */
/*
     * ============================================================
     * STUDENT TOPIC PROGRESS
     * ============================================================
     *//*


    private int importTopicProgress(
            JsonNode root,
            Instant importedAt
    ) {
        JsonNode currentProgress = root.path("progress");
        JsonNode startedAt = root.path("startedAt");
        JsonNode completedAt = root.path("completedAt");
        JsonNode timeSpent = root.path("timeSpent");

        Map<String, Boolean> processedRecords = new HashMap<>();
        int importedCount = 0;

        */
/*
         * Import completed topics first.
         *//*

        if (completedAt.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> students =
                    completedAt.fields();

            while (students.hasNext()) {
                Map.Entry<String, JsonNode> studentEntry =
                        students.next();

                String studentId = studentEntry.getKey();
                JsonNode completedTopics = studentEntry.getValue();

                if (!completedTopics.isObject()) {
                    continue;
                }

                Iterator<Map.Entry<String, JsonNode>> topics =
                        completedTopics.fields();

                while (topics.hasNext()) {
                    Map.Entry<String, JsonNode> topicEntry =
                            topics.next();

                    String topicId = topicEntry.getKey();

                    Instant completionTime =
                            timestampFromFlexibleNode(
                                    topicEntry.getValue()
                            );

                    Instant startTime = findTopicStartTime(
                            startedAt,
                            studentId,
                            topicId
                    );

                    long timeSpentMinutes = findTimeSpentMinutes(
                            timeSpent,
                            studentId,
                            topicId
                    );

                    upsertTopicProgress(
                            studentId,
                            topicId,
                            "COMPLETED",
                            startTime,
                            completionTime,
                            timeSpentMinutes,
                            importedAt
                    );

                    processedRecords.put(
                            studentId + ":" + topicId,
                            true
                    );

                    importedCount++;
                }
            }
        }

        */
/*
         * Import current topics.
         *
         * A topic already recorded as completed is not changed back to
         * IN_PROGRESS.
         *//*

        if (currentProgress.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> students =
                    currentProgress.fields();

            while (students.hasNext()) {
                Map.Entry<String, JsonNode> entry = students.next();

                String studentId = entry.getKey();
                String topicId = textOrNull(entry.getValue());

                if (isBlank(studentId) || isBlank(topicId)) {
                    continue;
                }

                String recordKey = studentId + ":" + topicId;

                if (processedRecords.containsKey(recordKey)) {
                    continue;
                }

                Instant startTime = findTopicStartTime(
                        startedAt,
                        studentId,
                        topicId
                );

                long timeSpentMinutes = findTimeSpentMinutes(
                        timeSpent,
                        studentId,
                        topicId
                );

                upsertTopicProgress(
                        studentId,
                        topicId,
                        "IN_PROGRESS",
                        startTime,
                        null,
                        timeSpentMinutes,
                        importedAt
                );

                importedCount++;
            }
        }

        return importedCount;
    }

    private void upsertTopicProgress(
            String studentId,
            String topicId,
            String status,
            Instant startedAt,
            Instant completedAt,
            long timeSpentMinutes,
            Instant importedAt
    ) {
        if (!studentExists(studentId)) {
            System.err.println(
                    "Skipped topic progress because student does not exist: "
                            + studentId
            );
            return;
        }

        if (!topicExists(topicId)) {
            System.err.println(
                    "Skipped topic progress because topic does not exist: "
                            + topicId
            );
            return;
        }

        String progressId = deterministicId(
                "student-topic-progress:"
                        + studentId
                        + ":"
                        + topicId,
                36
        );

        jdbcTemplate.update("""
                INSERT INTO public.student_topic_progress (
                    id,
                    completed_at,
                    created_at,
                    started_at,
                    status,
                    time_spent_minutes,
                    updated_at,
                    student_id,
                    topic_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (student_id, topic_id)
                DO UPDATE SET
                    completed_at = EXCLUDED.completed_at,
                    started_at = COALESCE(
                        EXCLUDED.started_at,
                        public.student_topic_progress.started_at
                    ),
                    status = EXCLUDED.status,
                    time_spent_minutes =
                        EXCLUDED.time_spent_minutes,
                    updated_at = EXCLUDED.updated_at
                """,
                progressId,
                toTimestamp(completedAt),
                Timestamp.from(importedAt),
                toTimestamp(startedAt),
                status,
                Math.max(0L, timeSpentMinutes),
                Timestamp.from(importedAt),
                studentId,
                topicId
        );
    }

    */
/*
     * ============================================================
     * STUDENT SUBTOPIC PROGRESS
     * ============================================================
     *//*


    private int importSubtopicProgress(
            JsonNode root,
            Instant importedAt
    ) {
        JsonNode subProgress = root.path("subProgressBool");
        JsonNode completedAt = root.path("completedAt");

        if (!subProgress.isObject()) {
            return 0;
        }

        int importedCount = 0;

        Iterator<Map.Entry<String, JsonNode>> students =
                subProgress.fields();

        while (students.hasNext()) {
            Map.Entry<String, JsonNode> studentEntry =
                    students.next();

            String studentId = studentEntry.getKey();
            JsonNode topicProgress = studentEntry.getValue();

            if (!studentExists(studentId)) {
                System.err.println(
                        "Skipped subtopic progress because student "
                                + "does not exist: "
                                + studentId
                );
                continue;
            }

            if (!topicProgress.isObject()) {
                continue;
            }

            Iterator<Map.Entry<String, JsonNode>> topics =
                    topicProgress.fields();

            while (topics.hasNext()) {
                Map.Entry<String, JsonNode> topicEntry =
                        topics.next();

                String topicId = topicEntry.getKey();
                JsonNode completionArray = topicEntry.getValue();

                if (!completionArray.isArray()) {
                    continue;
                }

                Instant topicCompletionTime =
                        getCompletedTopicTime(
                                completedAt,
                                studentId,
                                topicId
                        );

                for (int index = 0;
                     index < completionArray.size();
                     index++) {

                    boolean completed = completionArray
                            .get(index)
                            .asBoolean(false);

                    String subtopicId = subtopicIds.get(
                            createSubtopicMapKey(topicId, index)
                    );

                    if (subtopicId == null) {
                        System.err.println(
                                "Skipped subtopic progress because "
                                        + "no matching subtopic was found. "
                                        + "Topic: "
                                        + topicId
                                        + ", index: "
                                        + index
                        );
                        continue;
                    }

                    String progressId = deterministicId(
                            "student-subtopic-progress:"
                                    + studentId
                                    + ":"
                                    + subtopicId,
                            36
                    );

                    */
/*
                     * The original JSON only stores a completion timestamp
                     * at topic level. If the complete topic has a timestamp,
                     * the same timestamp is used for its completed subtopics.
                     *//*

                    Timestamp subtopicCompletedAt =
                            completed
                                    ? toTimestamp(topicCompletionTime)
                                    : null;

                    jdbcTemplate.update("""
                            INSERT INTO public.student_subtopic_progress (
                                id,
                                completed,
                                completed_at,
                                created_at,
                                updated_at,
                                student_id,
                                subtopic_id
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT (student_id, subtopic_id)
                            DO UPDATE SET
                                completed = EXCLUDED.completed,
                                completed_at =
                                    EXCLUDED.completed_at,
                                updated_at = EXCLUDED.updated_at
                            """,
                            progressId,
                            completed,
                            subtopicCompletedAt,
                            Timestamp.from(importedAt),
                            Timestamp.from(importedAt),
                            studentId,
                            subtopicId
                    );

                    importedCount++;
                }
            }
        }

        return importedCount;
    }

    */
/*
     * ============================================================
     * TEST RESULTS
     * ============================================================
     *//*


    private int importTestResults(
            JsonNode testScores,
            Instant importedAt
    ) {
        if (!testScores.isObject()) {
            return 0;
        }

        int importedCount = 0;

        Iterator<Map.Entry<String, JsonNode>> students =
                testScores.fields();

        while (students.hasNext()) {
            Map.Entry<String, JsonNode> studentEntry =
                    students.next();

            String studentId = studentEntry.getKey();
            JsonNode topicResults = studentEntry.getValue();

            if (!studentExists(studentId)) {
                System.err.println(
                        "Skipped test results because student "
                                + "does not exist: "
                                + studentId
                );
                continue;
            }

            if (!topicResults.isObject()) {
                continue;
            }

            Iterator<Map.Entry<String, JsonNode>> topics =
                    topicResults.fields();

            while (topics.hasNext()) {
                Map.Entry<String, JsonNode> topicEntry =
                        topics.next();

                String topicId = topicEntry.getKey();
                JsonNode tests = topicEntry.getValue();

                if (!topicExists(topicId)) {
                    System.err.println(
                            "Skipped test results because topic "
                                    + "does not exist: "
                                    + topicId
                    );
                    continue;
                }

                if (!tests.isArray()) {
                    continue;
                }

                for (JsonNode test : tests) {
                    Integer testNumber = integerOrNull(
                            test.get("testNumber")
                    );

                    if (testNumber == null) {
                        System.err.println(
                                "Skipped a test result because "
                                        + "testNumber was missing. "
                                        + "Student: "
                                        + studentId
                                        + ", topic: "
                                        + topicId
                        );
                        continue;
                    }

                    String testId = textOrNull(test.get("id"));

                    if (isBlank(testId)) {
                        testId = deterministicId(
                                "test-result:"
                                        + studentId
                                        + ":"
                                        + topicId
                                        + ":"
                                        + testNumber,
                                36
                        );
                    }

                    BigDecimal score = decimalOrNull(
                            test.get("score")
                    );

                    BigDecimal maximumScore = decimalOrNull(
                            test.get("max")
                    );

                    int awardedPoints = intOrDefault(
                            test.get("points"),
                            0
                    );

                    String remark = blankToNull(
                            textOrNull(test.get("remark"))
                    );

                    LocalDate testDate = parseDate(
                            textOrNull(test.get("date"))
                    );

                    */
/*
                     * The logical database uniqueness rule is:
                     * student_id + topic_id + test_number
                     *
                     * Therefore, conflict handling uses those columns,
                     * rather than relying only on the legacy test ID.
                     *//*

                    jdbcTemplate.update("""
                            INSERT INTO public.test_results (
                                id,
                                awarded_points,
                                created_at,
                                maximum_score,
                                remark,
                                score,
                                test_date,
                                test_number,
                                updated_at,
                                student_id,
                                topic_id
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT (
                                student_id,
                                topic_id,
                                test_number
                            )
                            DO UPDATE SET
                                awarded_points =
                                    EXCLUDED.awarded_points,
                                maximum_score =
                                    EXCLUDED.maximum_score,
                                remark = EXCLUDED.remark,
                                score = EXCLUDED.score,
                                test_date = EXCLUDED.test_date,
                                updated_at = EXCLUDED.updated_at
                            """,
                            testId,
                            Math.max(0, awardedPoints),
                            Timestamp.from(importedAt),
                            maximumScore,
                            remark,
                            score,
                            testDate == null
                                    ? null
                                    : Date.valueOf(testDate),
                            testNumber,
                            Timestamp.from(importedAt),
                            studentId,
                            topicId
                    );

                    importedCount++;
                }
            }
        }

        return importedCount;
    }

    */
/*
     * ============================================================
     * STUDENT NOTES
     * ============================================================
     *//*


    private int importStudentNotes(
            JsonNode studentNotes,
            Instant importedAt
    ) {
        if (!studentNotes.isObject()) {
            return 0;
        }

        int importedCount = 0;

        Iterator<Map.Entry<String, JsonNode>> students =
                studentNotes.fields();

        while (students.hasNext()) {
            Map.Entry<String, JsonNode> entry = students.next();

            String studentId = entry.getKey();
            JsonNode noteValue = entry.getValue();

            if (!studentExists(studentId)) {
                System.err.println(
                        "Skipped note because student does not exist: "
                                + studentId
                );
                continue;
            }

            */
/*
             * The database has UNIQUE(student_id), so only one note row
             * can exist for each student.
             *
             * If the JSON contains an array, all non-empty note values
             * are combined into one note.
             *//*

            String combinedNote = extractCombinedNote(noteValue);

            if (isBlank(combinedNote)) {
                continue;
            }

            if (combinedNote.length() > 2000) {
                combinedNote = combinedNote.substring(0, 2000);
            }

            String noteId = deterministicId(
                    "student-note:" + studentId,
                    36
            );

            jdbcTemplate.update("""
                    INSERT INTO public.student_notes (
                        id,
                        created_at,
                        note,
                        updated_at,
                        student_id
                    )
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT (student_id)
                    DO UPDATE SET
                        note = EXCLUDED.note,
                        updated_at = EXCLUDED.updated_at
                    """,
                    noteId,
                    Timestamp.from(importedAt),
                    combinedNote,
                    Timestamp.from(importedAt),
                    studentId
            );

            importedCount++;
        }

        return importedCount;
    }

    private String extractCombinedNote(JsonNode noteValue) {
        if (noteValue == null || noteValue.isNull()) {
            return null;
        }

        if (noteValue.isTextual()) {
            return blankToNull(noteValue.asText());
        }

        if (noteValue.isObject()) {
            return blankToNull(
                    textOrNull(noteValue.get("note"))
            );
        }

        if (!noteValue.isArray()) {
            return null;
        }

        StringBuilder combined = new StringBuilder();

        for (JsonNode noteNode : noteValue) {
            String note;

            if (noteNode.isTextual()) {
                note = blankToNull(noteNode.asText());
            } else if (noteNode.isObject()) {
                note = blankToNull(
                        textOrNull(noteNode.get("note"))
                );
            } else {
                note = null;
            }

            if (note == null) {
                continue;
            }

            if (!combined.isEmpty()) {
                combined.append(System.lineSeparator());
                combined.append(System.lineSeparator());
            }

            combined.append(note);
        }

        return combined.isEmpty()
                ? null
                : combined.toString();
    }

    */
/*
     * ============================================================
     * OVERALL POINT BASE
     * ============================================================
     *//*


    private void updateStudentOverallPointBase(JsonNode root) {
        JsonNode overallPointBase = root.path(
                "overallPointBase"
        );

        if (!overallPointBase.isObject()) {
            return;
        }

        Iterator<Map.Entry<String, JsonNode>> entries =
                overallPointBase.fields();

        while (entries.hasNext()) {
            Map.Entry<String, JsonNode> entry = entries.next();

            String studentId = entry.getKey();
            long pointBase = longOrDefault(
                    entry.getValue(),
                    0L
            );

            jdbcTemplate.update("""
                    UPDATE public.students
                    SET overall_point_base = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    Math.max(0L, pointBase),
                    studentId
            );
        }
    }

    */
/*
     * ============================================================
     * LAST ACTIVITY
     * ============================================================
     *//*


    private void updateStudentLastActivity(JsonNode root) {
        JsonNode lastActivity = root.path("lastActivity");

        if (!lastActivity.isObject()) {
            return;
        }

        Iterator<Map.Entry<String, JsonNode>> entries =
                lastActivity.fields();

        while (entries.hasNext()) {
            Map.Entry<String, JsonNode> entry = entries.next();

            String studentId = entry.getKey();
            Instant activity = timestampFromFlexibleNode(
                    entry.getValue()
            );

            if (activity == null) {
                continue;
            }

            jdbcTemplate.update("""
                    UPDATE public.students
                    SET last_activity_at = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    Timestamp.from(activity),
                    studentId
            );
        }
    }

    */
/*
     * ============================================================
     * PROGRESS VALUE EXTRACTION
     * ============================================================
     *//*


    private Instant findTopicStartTime(
            JsonNode startedAt,
            String studentId,
            String topicId
    ) {
        if (!startedAt.isObject()) {
            return null;
        }

        JsonNode studentValue = startedAt.get(studentId);

        if (studentValue == null || studentValue.isNull()) {
            return null;
        }

        */
/*
         * Supports both forms:
         *
         * "startedAt": {
         *     "studentId": 123456789
         * }
         *
         * and:
         *
         * "startedAt": {
         *     "studentId": {
         *         "topicId": 123456789
         *     }
         * }
         *//*

        if (studentValue.isObject()) {
            return timestampFromFlexibleNode(
                    studentValue.get(topicId)
            );
        }

        return timestampFromFlexibleNode(studentValue);
    }

    private long findTimeSpentMinutes(
            JsonNode timeSpent,
            String studentId,
            String topicId
    ) {
        if (!timeSpent.isObject()) {
            return 0L;
        }

        JsonNode studentValue = timeSpent.get(studentId);

        if (studentValue == null || studentValue.isNull()) {
            return 0L;
        }

        if (studentValue.isObject()) {
            return Math.max(
                    0L,
                    longOrDefault(
                            studentValue.get(topicId),
                            0L
                    )
            );
        }

        return Math.max(
                0L,
                longOrDefault(studentValue, 0L)
        );
    }

    private Instant getCompletedTopicTime(
            JsonNode completedAt,
            String studentId,
            String topicId
    ) {
        if (!completedAt.isObject()) {
            return null;
        }

        JsonNode studentCompletion = completedAt.get(studentId);

        if (studentCompletion == null
                || !studentCompletion.isObject()) {
            return null;
        }

        return timestampFromFlexibleNode(
                studentCompletion.get(topicId)
        );
    }

    private Instant extractStudentTimestamp(
            JsonNode source,
            String studentId
    ) {
        if (source == null || !source.isObject()) {
            return null;
        }

        return timestampFromFlexibleNode(
                source.get(studentId)
        );
    }

    */
/*
     * ============================================================
     * DATABASE EXISTENCE CHECKS
     * ============================================================
     *//*


    private boolean studentExists(String studentId) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM public.students
                WHERE id = ?
                """,
                Integer.class,
                studentId
        );

        return count != null && count > 0;
    }

    private boolean topicExists(String topicId) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM public.topics
                WHERE id = ?
                """,
                Integer.class,
                topicId
        );

        return count != null && count > 0;
    }

    */
/*
     * ============================================================
     * ID GENERATION
     * ============================================================
     *//*


    private String generateSubtopicId(
            String topicId,
            int index,
            String title
    ) {
        return deterministicId(
                "subtopic:"
                        + topicId
                        + ":"
                        + index
                        + ":"
                        + title,
                36
        );
    }

    private String createSubtopicMapKey(
            String topicId,
            int index
    ) {
        return topicId + ":" + index;
    }

    private String deterministicId(
            String source,
            int maximumLength
    ) {
        try {
            MessageDigest digest = MessageDigest.getInstance(
                    "SHA-256"
            );

            byte[] hash = digest.digest(
                    source.getBytes(StandardCharsets.UTF_8)
            );

            StringBuilder result = new StringBuilder();

            for (byte value : hash) {
                result.append(
                        String.format("%02x", value)
                );
            }

            return result.substring(
                    0,
                    Math.min(maximumLength, result.length())
            );
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Could not generate deterministic ID.",
                    exception
            );
        }
    }

    */
/*
     * ============================================================
     * JSON AND VALUE CONVERSION
     * ============================================================
     *//*


    private String textOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }

        String value = node.asText();

        return value == null
                ? null
                : value.trim();
    }

    private String blankToNull(String value) {
        return isBlank(value)
                ? null
                : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private Integer integerOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }

        if (node.isIntegralNumber()) {
            return node.asInt();
        }

        String value = node.asText().trim();

        if (value.isEmpty()) {
            return null;
        }

        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private int intOrDefault(
            JsonNode node,
            int defaultValue
    ) {
        Integer value = integerOrNull(node);

        return value == null
                ? defaultValue
                : value;
    }

    private Long longOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }

        if (node.isIntegralNumber()) {
            return node.asLong();
        }

        String value = node.asText().trim();

        if (value.isEmpty()) {
            return null;
        }

        try {
            return Long.parseLong(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private long longOrDefault(
            JsonNode node,
            long defaultValue
    ) {
        Long value = longOrNull(node);

        return value == null
                ? defaultValue
                : value;
    }

    private BigDecimal decimalOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }

        if (node.isNumber()) {
            return node.decimalValue();
        }

        String value = node.asText().trim();

        if (value.isEmpty()) {
            return null;
        }

        try {
            return new BigDecimal(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    */
/*
     * ============================================================
     * DATE AND TIME CONVERSION
     * ============================================================
     *//*


    private Instant timestampFromFlexibleNode(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }

        if (node.isNumber()) {
            return epochMillisToInstant(node.asLong());
        }

        if (!node.isTextual()) {
            return null;
        }

        String value = node.asText().trim();

        if (value.isEmpty()) {
            return null;
        }

        try {
            return Instant.ofEpochMilli(
                    Long.parseLong(value)
            );
        } catch (NumberFormatException ignored) {
            return parseInstant(value);
        }
    }

    private Instant epochMillisToInstant(long epochMillis) {
        if (epochMillis <= 0L) {
            return null;
        }

        try {
            return Instant.ofEpochMilli(epochMillis);
        } catch (Exception exception) {
            return null;
        }
    }

    private Instant parseInstant(String value) {
        if (isBlank(value)) {
            return null;
        }

        try {
            return Instant.parse(value);
        } catch (Exception exception) {
            return null;
        }
    }

    private LocalDate parseDate(String value) {
        if (isBlank(value)) {
            return null;
        }

        try {
            return LocalDate.parse(value);
        } catch (Exception exception) {
            return null;
        }
    }

    private Timestamp toTimestamp(Instant instant) {
        return instant == null
                ? null
                : Timestamp.from(instant);
    }
}*/
