package org.hilal.studentmanagement.config;


import java.sql.Connection;
import java.sql.DatabaseMetaData;

import javax.sql.DataSource;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseConnectionCheck implements CommandLineRunner {

    private final DataSource dataSource;

    public DatabaseConnectionCheck(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metadata = connection.getMetaData();

            System.out.println("----------------------------------------");
            System.out.println("PostgreSQL connection successful");
            System.out.println(
                    "Database: " + metadata.getDatabaseProductName()
            );
            System.out.println(
                    "Database version: "
                            + metadata.getDatabaseProductVersion()
            );
            System.out.println(
                    "JDBC URL: " + metadata.getURL()
            );
            System.out.println("----------------------------------------");
        }
    }
}