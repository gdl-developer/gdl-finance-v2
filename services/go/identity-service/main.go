package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"time"

	pb "github.com/gdl/identity-service/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// IdentityService implementation
type server struct {
	pb.UnimplementedIdentityServiceServer
	db *gorm.DB
}

// User model for GORM
type User struct {
	ID           uint      `gorm:"primaryKey"`
	Email        string    `gorm:"unique;not null"`
	Password     string    `gorm:"not null"`
	FirstName    string    `gorm:"not null"`
	LastName     string    `gorm:"not null"`
	PhoneNumber  string    `gorm:"unique;not null"`
	UserType     string    `gorm:"default:CUSTOMER"` // CUSTOMER, ADMIN, SUPER_ADMIN
	Status       string    `gorm:"default:ACTIVE"`
	RoleID       uint
	Role         Role      `gorm:"foreignKey:RoleID"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Role struct {
	ID          uint         `gorm:"primaryKey"`
	Name        string       `gorm:"unique;not null"`
	Permissions []Permission `gorm:"many2many:role_permissions;"`
}

type Permission struct {
	ID   uint   `gorm:"primaryKey"`
	Name string `gorm:"unique;not null"`
}

type BusinessUnit struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"unique;not null"`
	ManagerID uint
}

type Branch struct {
	ID             uint   `gorm:"primaryKey"`
	Name           string `gorm:"unique;not null"`
	BusinessUnitID uint
}

type OTP struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    uint      `gorm:"not null"`
	Code      string    `gorm:"not null"`
	Type      string    `gorm:"not null"` // LOGIN, PASSWORD_RESET, TRANSACTION
	ExpiresAt time.Time `gorm:"not null"`
}

type AuditLog struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    uint      `gorm:"not null"`
	Action    string    `gorm:"not null"`
	Timestamp time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

type ConsentAuditLog struct {
	ID            uint      `gorm:"primaryKey"`
	UserID        uint      `gorm:"not null"`
	ConsentType   string    `gorm:"not null"` // TERMS, PRIVACY, MARKETING
	Accepted      bool      `gorm:"not null"`
	PolicyVersion string    `gorm:"not null"`
	Timestamp     time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

type KYCLevel struct {
	ID         uint    `gorm:"primaryKey"`
	UserID     uint    `gorm:"unique;not null"`
	Level      int     `gorm:"default:1"`
	DailyLimit float64 `gorm:"default:50000"`
}

type SecurityQuestion struct {
	ID       uint   `gorm:"primaryKey"`
	Question string `gorm:"unique;not null"`
}

type UserSecurityQuestion struct {
	ID                 uint `gorm:"primaryKey"`
	UserID             uint `gorm:"not null"`
	SecurityQuestionID uint `gorm:"not null"`
	Answer             string `gorm:"not null"`
}

type Company struct {
	ID      uint   `gorm:"primaryKey"`
	Name    string `gorm:"unique;not null"`
	Address string
}

type CompanyUser struct {
	ID        uint `gorm:"primaryKey"`
	CompanyID uint `gorm:"not null"`
	UserID    uint `gorm:"not null"`
}

func (s *server) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.IdentityResponse, error) {
	log.Printf("Registering user: %s", req.Email)
	return &pb.IdentityResponse{Success: true, Message: "User registered successfully", UserId: "123"}, nil
}

func (s *server) Login(ctx context.Context, req *pb.LoginRequest) (*pb.IdentityResponse, error) {
	log.Printf("Login attempt: %s", req.Email)
	return &pb.IdentityResponse{Success: true, Message: "Login successful", Token: "mock-token-v2"}, nil
}

func (s *server) VerifyMFA(ctx context.Context, req *pb.VerifyMFARequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "MFA verified"}, nil
}

func (s *server) GetProfile(ctx context.Context, req *pb.GetProfileRequest) (*pb.GetProfileResponse, error) {
	return &pb.GetProfileResponse{
		UserId:      req.UserId,
		Email:       "test@example.com",
		FirstName:   "Test",
		LastName:    "User",
		PhoneNumber: "08012345678",
		Status:      "ACTIVE",
	}, nil
}

func (s *server) UpdateProfile(ctx context.Context, req *pb.UpdateProfileRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Profile updated"}, nil
}

func (s *server) ChangePassword(ctx context.Context, req *pb.ChangePasswordRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Password changed"}, nil
}

func (s *server) ResetPassword(ctx context.Context, req *pb.ResetPasswordRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Password reset"}, nil
}

func (s *server) SetPIN(ctx context.Context, req *pb.PINRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "PIN set"}, nil
}

func (s *server) VerifyPIN(ctx context.Context, req *pb.PINRequest) (*pb.PINResponse, error) {
	return &pb.PINResponse{Success: true, Message: "PIN verified"}, nil
}

func (s *server) GetKYCStatus(ctx context.Context, req *pb.GetKYCStatusRequest) (*pb.KYCStatusResponse, error) {
	return &pb.KYCStatusResponse{UserId: req.UserId, Level: 1, DailyLimit: 50000}, nil
}

func (s *server) UpdateKYCLevel(ctx context.Context, req *pb.UpdateKYCRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "KYC level updated"}, nil
}

func (s *server) GetSecurityQuestions(ctx context.Context, req *pb.Empty) (*pb.SecurityQuestionsResponse, error) {
	return &pb.SecurityQuestionsResponse{}, nil
}

func (s *server) SetUserSecurityQuestions(ctx context.Context, req *pb.SetSecurityQuestionsRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Security questions set"}, nil
}

func (s *server) VerifySecurityAnswer(ctx context.Context, req *pb.VerifySecurityAnswerRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Security answer verified"}, nil
}

func (s *server) ExportData(ctx context.Context, req *pb.ExportDataRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Data export initiated"}, nil
}

func (s *server) DeleteAccount(ctx context.Context, req *pb.DeleteAccountRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Account marked for deletion"}, nil
}

func (s *server) UpdateConsent(ctx context.Context, req *pb.UpdateConsentRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Consent updated"}, nil
}

func (s *server) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Token refreshed", Token: "new-mock-token"}, nil
}

func (s *server) CreateRole(ctx context.Context, req *pb.RoleRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Role created"}, nil
}

func (s *server) AssignRole(ctx context.Context, req *pb.AssignRoleRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Role assigned"}, nil
}

func (s *server) GetRoles(ctx context.Context, req *pb.Empty) (*pb.RolesResponse, error) {
	return &pb.RolesResponse{}, nil
}

func (s *server) CreateBusinessUnit(ctx context.Context, req *pb.BusinessUnitRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Business unit created"}, nil
}

func (s *server) GetBusinessUnits(ctx context.Context, req *pb.Empty) (*pb.BusinessUnitsResponse, error) {
	return &pb.BusinessUnitsResponse{}, nil
}

func (s *server) UpdateBusinessUnit(ctx context.Context, req *pb.BusinessUnitRequest) (*pb.IdentityResponse, error) {
	return &pb.IdentityResponse{Success: true, Message: "Business unit updated"}, nil
}

func (s *server) DeleteBusinessUnit(ctx context.Context, req *pb.BusinessUnitRequest) (*pb.DeleteBusinessUnitResponse, error) {
	return &pb.DeleteBusinessUnitResponse{Success: true, Message: "Business unit deleted successfully"}, nil
}

func main() {
	godotenv.Load()

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USERNAME")
	dbPass := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	// Use URI-style DSN for better compatibility with Managed DB and SSL
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=require",
		dbUser, dbPass, dbHost, dbPort, dbName)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// Auto Migrate the models
	db.AutoMigrate(&User{}, &Role{}, &Permission{}, &BusinessUnit{}, &Branch{}, &OTP{}, &AuditLog{}, &ConsentAuditLog{}, &KYCLevel{}, &SecurityQuestion{}, &UserSecurityQuestion{}, &Company{}, &CompanyUser{})

	// Seed Data
	SeedIdentityData(db)

	log.Println("Starting Identity Service (Go)...")

	port := os.Getenv("PORT")
	if port == "" {
		port = "50052"
	}

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterIdentityServiceServer(s, &server{db: db})

	log.Printf("Server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

// SeedIdentityData seeds initial roles and permissions
func SeedIdentityData(db *gorm.DB) {
	var count int64
	db.Model(&Role{}).Count(&count)
	if count == 0 {
		log.Println("Seeding Identity Data...")
		adminRole := Role{Name: "ADMIN"}
		db.Create(&adminRole)
		
		superAdminRole := Role{Name: "SUPER_ADMIN"}
		db.Create(&superAdminRole)
		
		customerRole := Role{Name: "CUSTOMER"}
		db.Create(&customerRole)
	}
}
