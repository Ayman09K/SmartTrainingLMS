package com.smarttraining.auth.repository;

import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.enums.AccountStatus;
import com.smarttraining.auth.enums.UserRole;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(UserRole role);

    @Query("""
        SELECT u
        FROM User u
        WHERE u.role = :role
          AND u.enabled = true
          AND u.accountStatus = :status
          AND (
                :query = ''
                OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(CONCAT(CONCAT(u.firstName, ' '), u.lastName))
                   LIKE LOWER(CONCAT('%', :query, '%'))
          )
        ORDER BY u.firstName ASC, u.lastName ASC, u.email ASC
        """)
    List<User> searchActiveUsersByRole(
            @Param("role") UserRole role,
            @Param("status") AccountStatus status,
            @Param("query") String query,
            Pageable pageable
    );

    List<User> findByIdInAndRole(List<Long> ids, UserRole role);

    @Query("""
        SELECT u
        FROM User u
        WHERE u.role IN :roles
          AND u.enabled = true
          AND u.accountStatus = :status
          AND (
                :query = ''
                OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(CONCAT(CONCAT(u.firstName, ' '), u.lastName))
                   LIKE LOWER(CONCAT('%', :query, '%'))
          )
        ORDER BY u.firstName ASC, u.lastName ASC, u.email ASC
        """)
    List<User> searchActiveUsersByRoles(
            @Param("roles") Set<UserRole> roles,
            @Param("status") AccountStatus status,
            @Param("query") String query,
            Pageable pageable
    );

    @Query("""
        SELECT u
        FROM User u
        WHERE u.id IN :ids
          AND u.role IN :roles
          AND u.enabled = true
          AND u.accountStatus = :status
        """)
    List<User> findActiveUsersByIdInAndRoleIn(
            @Param("ids") List<Long> ids,
            @Param("roles") Set<UserRole> roles,
            @Param("status") AccountStatus status
    );
}
