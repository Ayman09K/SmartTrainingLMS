package com.smarttraining.auth.entity;

import com.smarttraining.auth.enums.AccountStatus;
import com.smarttraining.auth.enums.Civilite;
import com.smarttraining.auth.enums.UserRole;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Locale;

@Entity
@Table(
    name = "users",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_users_email", columnNames = "email")
    }
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String firstName;

    @Column(nullable = false, length = 80)
    private String lastName;

    @Column(nullable = false, length = 150)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Civilite civilite = Civilite.NON_RENSEIGNEE;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String avatarDataUrl;

    @Column(nullable = false)
    private String password;
    @Column(name = "auth_token_version", nullable = false)
    private long authTokenVersion = 0L;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserRole role;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AccountStatus accountStatus = AccountStatus.ACTIVE;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public User() {
    }

    public User(String firstName, String lastName, String email, String password, UserRole role) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.role = role;
        this.enabled = true;
        this.accountStatus = AccountStatus.ACTIVE;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (enabled == null) {
            enabled = true;
        }
        if (accountStatus == null) {
            accountStatus = AccountStatus.ACTIVE;
        }
        if (civilite == null) {
            civilite = Civilite.NON_RENSEIGNEE;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isActiveAccount() {
        return Boolean.TRUE.equals(enabled) && accountStatus == AccountStatus.ACTIVE;
    }

    public void activate() {
        this.enabled = true;
        this.accountStatus = AccountStatus.ACTIVE;
    }

    public void disable() {
        this.enabled = false;
        this.accountStatus = AccountStatus.DISABLED;
    }

    public void suspend() {
        this.enabled = false;
        this.accountStatus = AccountStatus.SUSPENDED;
    }

    public String getFullName() {
        return firstName + " " + lastName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    public Civilite getCivilite() {
        return civilite;
    }

    public void setCivilite(Civilite civilite) {
        this.civilite = civilite == null
                ? Civilite.NON_RENSEIGNEE
                : civilite;
    }

    public String getAvatarDataUrl() {
        return avatarDataUrl;
    }

    public void setAvatarDataUrl(String avatarDataUrl) {
        this.avatarDataUrl = avatarDataUrl;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
        if (Boolean.FALSE.equals(enabled) && accountStatus == AccountStatus.ACTIVE) {
            accountStatus = AccountStatus.DISABLED;
        }
        if (Boolean.TRUE.equals(enabled) && accountStatus == AccountStatus.DISABLED) {
            accountStatus = AccountStatus.ACTIVE;
        }
    }

    public AccountStatus getAccountStatus() {
        return accountStatus;
    }

    public void setAccountStatus(AccountStatus accountStatus) {
        this.accountStatus = accountStatus;
        if (accountStatus == AccountStatus.ACTIVE) {
            this.enabled = true;
        }
        if (accountStatus == AccountStatus.DISABLED || accountStatus == AccountStatus.SUSPENDED) {
            this.enabled = false;
        }
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public long getAuthTokenVersion() {
        return authTokenVersion;
    }

    public void bumpAuthTokenVersion() {
        if (authTokenVersion == Long.MAX_VALUE) {
            throw new IllegalStateException(
                    "Version de session utilisateur epuisee."
            );
        }

        authTokenVersion++;
    }}
