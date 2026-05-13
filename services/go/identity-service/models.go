package main

import (
	"time"

	"gorm.io/gorm"
)

// KYCLevel defines transaction limits and requirements for each tier.
// Fintech Standard: CBN Tiered KYC compliance.
type KYCLevel struct {
	ID           uint    `gorm:"primaryKey;type:int(11)"`
	Level        int     `gorm:"uniqueIndex"`                           // 1, 2, 3
	Name         string  `gorm:"type:varchar(50);not null" json:"name"` // BRONZE, SILVER, GOLD
	DailyLimit   float64 `json:"daily_limit"`
	MaxBalance   float64 `json:"max_balance"`
	Requirements string  `gorm:"type:text" json:"requirements"` // JSON string of required docs
}

// UserSecurityQuestion stores a user's specific answers to security challenges.
// OWASP: Answers are hashed before storage.
type UserSecurityQuestion struct {
	ID         uint   `gorm:"primaryKey;type:int(11)"`
	UserID     uint   `gorm:"column:user_id;index;type:int(11)"`
	Question   string `gorm:"column:question"` // V1 compatibility
	Answer     string `gorm:"column:answer"`   // V1 compatibility
	QuestionID uint   `json:"question_id"`     // V2 future-proofing
	AnswerHash string `json:"-"`               // V2 future-proofing
	CreatedAt  time.Time
}

func (UserSecurityQuestion) TableName() string {
	return "user_security_question"
}

type SecurityQuestion struct {
	ID        uint      `gorm:"primaryKey;type:int(11)"`
	Question  string    `gorm:"type:varchar(255);uniqueIndex;not null"`
	CreatedAt time.Time `json:"created_at"`
}

// User represents the core user account in the system.
type User struct {
	ID                 uint    `gorm:"primaryKey;type:int(11)" json:"id"`
	Email              string  `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash       string  `gorm:"column:password;not null" json:"-"`
	FirstName          string  `gorm:"column:first_name" json:"first_name"`
	LastName           string  `gorm:"column:last_name" json:"last_name"`
	PhoneNumber        *string `gorm:"column:phone;type:varchar(255);index" json:"phone_number"`
	Status             string  `gorm:"column:account_status;default:'PENDING_VERIFICATION'" json:"status"`
	AccountType        string  `gorm:"column:account_type;default:'INDIVIDUAL'" json:"account_type"` // INDIVIDUAL or CORPORATE
	IsTwoFactorEnabled bool    `gorm:"column:is_2fa_enabled;default:false" json:"is_2fa_enabled"`
	UserType           string  `gorm:"column:user_type;default:'USER'" json:"user_type"`

	// Corporate Linking
	CompanyID *uint    `gorm:"type:int(11)" json:"company_id"`
	Company   *Company `json:"company"`

	// Security PINs (Hashed)
	LoginPinHash       string `json:"-"`
	TransactionPinHash string `json:"-"`

	// GDPR/NDPR Encrypted Fields
	EncryptedBVN   string `json:"-"`
	EncryptedPhone string `json:"-"`

	// KYC
	KYCLevelID uint     `gorm:"type:int(11)" json:"kyc_level_id"`
	KYCLevel   KYCLevel `json:"kyc_level"`

	// GDPR/NDPR Compliance
	TermsAccepted         bool       `gorm:"default:false" json:"terms_accepted"`
	PrivacyPolicyAccepted bool       `gorm:"default:false" json:"privacy_policy_accepted"`
	MarketingConsent      bool       `gorm:"default:false" json:"marketing_consent"`
	ConsentTimestamp      *time.Time `json:"consent_timestamp"`
	PolicyVersion         string     `json:"policy_version"`
	IsDeleted             bool       `gorm:"default:false" json:"is_deleted"`

	// Profile Information
	DateOfBirth         string `json:"date_of_birth"`
	Address             string `json:"address"`
	Country             string `json:"country"`
	City                string `json:"city"`
	State               string `json:"state"`
	Gender              string `json:"gender"`
	MaritalStatus       string `json:"marital_status"`
	NIN                 string `json:"nin"`
	ReferredBy          string `json:"referred_by"`
	HowHeardAboutUs     string `json:"how_heard_about_us"`
	RegistrationChannel string `json:"registration_channel"`
	UserTxnRef          string `json:"user_txn_ref"`

	// RBAC
	RoleID uint `gorm:"type:int(11)" json:"role_id"`
	Role   Role `json:"role"`

	LastLoginIP string         `json:"last_login_ip"`
	LastLoginAt *time.Time     `json:"last_login_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

func (User) TableName() string {
	return "user_account"
}

type Company struct {
	ID              uint           `gorm:"primaryKey;type:int(11)" json:"id"`
	Name            string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"name"`
	RegistrationNum string         `gorm:"type:varchar(255);uniqueIndex" json:"registration_num"` // RC Number
	TaxID           string         `json:"tax_id"`
	Address         string         `json:"address"`
	Status          string         `gorm:"default:'PENDING_APPROVAL'" json:"status"`
	Users           []User         `gorm:"foreignKey:CompanyID" json:"users"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

type CompanyUser struct {
	ID        uint   `gorm:"primaryKey;type:int(11)"`
	CompanyID uint   `gorm:"index;type:int(11)"`
	UserID    uint   `gorm:"index;type:int(11)"`
	Role      string `json:"role"` // OWNER, ADMIN, SIGNATORY
	CreatedAt time.Time
}

type Role struct {
	ID          uint         `gorm:"primaryKey;type:int(11)" json:"id"`
	Name        string       `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"` // ADMIN, USER, COMPLIANCE
	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

type Permission struct {
	ID          uint      `gorm:"primaryKey;type:int(11)" json:"id"`
	Name        string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"` // USER_CREATE, ACCOUNT_VIEW
	Description string    `gorm:"type:varchar(255)" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type BusinessUnit struct {
	ID        uint     `gorm:"primaryKey;type:int(11)" json:"id"`
	Name      string   `gorm:"type:varchar(255);uniqueIndex;not null" json:"name"`
	ManagerID uint     `gorm:"type:int(11)" json:"manager_id"`
	Branches  []Branch `json:"branches"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Branch struct {
	ID             uint         `gorm:"primaryKey;type:int(11)" json:"id"`
	Name           string       `gorm:"type:varchar(255);uniqueIndex;not null" json:"name"`
	Address        string       `json:"address"`
	BusinessUnitID uint         `gorm:"type:int(11)" json:"business_unit_id"`
	BusinessUnit   BusinessUnit `json:"-"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// OTP represents One-Time Passwords for email verification, password reset, and 2FA.
// OWASP: Short-lived, used once, hashed if sensitive.
type OTP struct {
	ID        uint      `gorm:"primaryKey;type:int(11)"`
	UserID    uint      `gorm:"column:user_id;index;type:int(11)"`
	Code      string    `gorm:"column:request_otp;not null"`
	Type      string    `gorm:"column:request_type;not null"` // VERIFICATION, RESET, 2FA
	ExpiresAt time.Time `gorm:"column:expires_at;not null"`
	IsUsed    bool      `gorm:"column:is_used;default:false"`
	CreatedAt time.Time
}

func (OTP) TableName() string {
	return "auth_actions"
}

// AuditLog tracks sensitive security events.
// Fintech Standard: Immutable trail of login attempts and profile changes.
type AuditLog struct {
	ID        uint      `gorm:"primaryKey;type:int(11)"`
	UserID    uint      `gorm:"column:user_id;index;type:int(11)"`
	Action    string    `json:"action"` // LOGIN_SUCCESS, LOGIN_FAILURE, PASSWORD_CHANGE
	IPAddress string    `gorm:"column:user_ip" json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
}

func (AuditLog) TableName() string {
	return "login_history"
}

type ConsentAuditLog struct {
	ID                    uint      `gorm:"primaryKey;type:int(11)"`
	UserID                uint      `gorm:"index;type:int(11)"`
	TermsAccepted         bool      `json:"terms_accepted"`
	PrivacyPolicyAccepted bool      `json:"privacy_policy_accepted"`
	MarketingConsent      bool      `json:"marketing_consent"`
	PolicyVersion         string    `json:"policy_version"`
	IPAddress             string    `json:"ip_address"`
	UserAgent             string    `json:"user_agent"`
	CreatedAt             time.Time `json:"created_at"`
}
