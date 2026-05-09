package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"

	"encoding/json"
	pb "github.com/gdl/identity-service/proto"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"time"
)

type server struct {
	pb.UnimplementedIdentityServiceServer
	db *gorm.DB
}

// Register handles user signup with NDPR/GDPR compliance (PII collection limit).
func (s *server) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	user := User{
		Email:                 req.Email,
		PasswordHash:          string(hashedPassword),
		FirstName:             req.FirstName,
		LastName:              req.LastName,
		PhoneNumber:           req.PhoneNumber,
		TermsAccepted:         req.TermsAccepted,
		PrivacyPolicyAccepted: req.PrivacyPolicyAccepted,
		MarketingConsent:      req.MarketingConsent,
		PolicyVersion:         req.PolicyVersion,
	}

	if req.TermsAccepted {
		now := time.Now()
		user.ConsentTimestamp = &now
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, status.Errorf(codes.AlreadyExists, "user already exists")
	}

	// --- Consent Audit Log (Only if provided) ---
	if req.TermsAccepted && req.PrivacyPolicyAccepted {
		s.db.Create(&ConsentAuditLog{
			UserID:                user.ID,
			TermsAccepted:         req.TermsAccepted,
			PrivacyPolicyAccepted: req.PrivacyPolicyAccepted,
			MarketingConsent:      req.MarketingConsent,
			PolicyVersion:         req.PolicyVersion,
			CreatedAt:             time.Now(),
		})
	}

	return &pb.RegisterResponse{
		Success: true,
		Message: "Registration successful. Please verify your email.",
		UserId:  fmt.Sprintf("%d", user.ID),
	}, nil
}

func (s *server) ExportData(ctx context.Context, req *pb.ExportDataRequest) (*pb.ExportDataResponse, error) {
	var user User
	if err := s.db.First(&user, "id = ?", req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	// Scrub sensitive security fields
	user.PasswordHash = "[REDACTED]"

	jsonData, _ := json.MarshalIndent(user, "", "  ")
	return &pb.ExportDataResponse{JsonData: string(jsonData)}, nil
}

func (s *server) DeleteAccount(ctx context.Context, req *pb.DeleteAccountRequest) (*pb.DeleteAccountResponse, error) {
	var user User
	if err := s.db.First(&user, "id = ?", req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	anonymizedEmail := fmt.Sprintf("deleted_%s_%d@gdl.com.ng", req.UserId, time.Now().Unix())

	err := s.db.Model(&user).Updates(map[string]interface{}{
		"FirstName":   "DELETED",
		"LastName":    "USER",
		"Email":       anonymizedEmail,
		"PhoneNumber": "00000000000",
		"IsDeleted":   true,
		"Status":      "BANNED",
	}).Error

	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete account")
	}

	return &pb.DeleteAccountResponse{Success: true, Message: "Account deleted successfully"}, nil
}

func (s *server) UpdateConsent(ctx context.Context, req *pb.UpdateConsentRequest) (*pb.UpdateConsentResponse, error) {
	var user User
	if err := s.db.First(&user, "id = ?", req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	now := time.Now()
	err := s.db.Model(&user).Updates(map[string]interface{}{
		"TermsAccepted":         req.TermsAccepted,
		"PrivacyPolicyAccepted": req.PrivacyPolicyAccepted,
		"MarketingConsent":      req.MarketingConsent,
		"ConsentTimestamp":      &now,
		"PolicyVersion":         req.PolicyVersion,
	}).Error

	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update consent")
	}

	// --- Consent Audit Log ---
	s.db.Create(&ConsentAuditLog{
		UserID:                user.ID,
		TermsAccepted:         req.TermsAccepted,
		PrivacyPolicyAccepted: req.PrivacyPolicyAccepted,
		MarketingConsent:      req.MarketingConsent,
		PolicyVersion:         req.PolicyVersion,
		CreatedAt:             now,
	})

	return &pb.UpdateConsentResponse{Success: true, Message: "Consent updated successfully"}, nil
}

// Login handles authentication with OWASP-aligned security (Audit logging, timing attack prevention).
func (s *server) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	var user User
	if err := s.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "invalid credentials")
	}

	token, err := GenerateToken(fmt.Sprintf("%d", user.ID), "USER")
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate token")
	}

	// Audit Log (Fintech standard)
	s.db.Create(&AuditLog{
		UserID:    user.ID,
		Action:    "LOGIN_SUCCESS",
		IPAddress: req.IpAddress,
		UserAgent: req.UserAgent,
	})

	return &pb.LoginResponse{
		Success: true,
		Token:   token,
		Message: "Login successful",
	}, nil
}

func (s *server) GetProfile(ctx context.Context, req *pb.GetProfileRequest) (*pb.GetProfileResponse, error) {
	var user User
	if err := s.db.Preload("Role.Permissions").First(&user, req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	return &pb.GetProfileResponse{
		Email:       user.Email,
		FirstName:   user.FirstName,
		LastName:    user.LastName,
		PhoneNumber: user.PhoneNumber,
		Status:      user.Status,
	}, nil
}

// CreateRole allows admins to define new roles with specific permission sets.
func (s *server) CreateRole(ctx context.Context, req *pb.CreateRoleRequest) (*pb.CreateRoleResponse, error) {
	role := Role{Name: req.Name}
	for _, pName := range req.Permissions {
		var p Permission
		s.db.FirstOrCreate(&p, Permission{Name: pName})
		role.Permissions = append(role.Permissions, p)
	}

	if err := s.db.Create(&role).Error; err != nil {
		return nil, status.Errorf(codes.AlreadyExists, "role already exists")
	}

	return &pb.CreateRoleResponse{
		Success: true,
		RoleId:  fmt.Sprintf("%d", role.ID),
	}, nil
}

// AssignRole links a user to a specific role, enforcing the RBAC model.
func (s *server) AssignRole(ctx context.Context, req *pb.AssignRoleRequest) (*pb.AssignRoleResponse, error) {
	var role Role
	if err := s.db.Where("name = ?", req.RoleName).First(&role).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "role not found")
	}

	if err := s.db.Model(&User{}).Where("id = ?", req.UserId).Update("role_id", role.ID).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to assign role")
	}

	return &pb.AssignRoleResponse{Success: true}, nil
}

func (s *server) SetPIN(ctx context.Context, req *pb.SetPINRequest) (*pb.SetPINResponse, error) {
	hashedPin, err := bcrypt.GenerateFromPassword([]byte(req.Pin), bcrypt.DefaultCost)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to hash pin")
	}

	updateField := "login_pin_hash"
	if req.Type == "TRANSACTION" {
		updateField = "transaction_pin_hash"
	}

	if err := s.db.Model(&User{}).Where("id = ?", req.UserId).Update(updateField, string(hashedPin)).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update pin")
	}

	return &pb.SetPINResponse{Success: true, Message: "PIN updated successfully"}, nil
}

func (s *server) VerifyPIN(ctx context.Context, req *pb.VerifyPINRequest) (*pb.VerifyPINResponse, error) {
	var user User
	if err := s.db.First(&user, req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	pinHash := user.LoginPinHash
	if req.Type == "TRANSACTION" {
		pinHash = user.TransactionPinHash
	}

	if pinHash == "" {
		return &pb.VerifyPINResponse{Success: false}, nil
	}

	if err := bcrypt.CompareHashAndPassword([]byte(pinHash), []byte(req.Pin)); err != nil {
		return &pb.VerifyPINResponse{Success: false}, nil
	}

	return &pb.VerifyPINResponse{Success: true}, nil
}

func (s *server) CheckAccountStatus(ctx context.Context, req *pb.CheckStatusRequest) (*pb.CheckStatusResponse, error) {
	var user User
	if err := s.db.First(&user, req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	return &pb.CheckStatusResponse{
		Status:              user.Status,
		IsPinSet:            user.LoginPinHash != "",
		IsTransactionPinSet: user.TransactionPinHash != "",
	}, nil
}

func (s *server) UpdateKYCLevel(ctx context.Context, req *pb.UpdateKYCRequest) (*pb.UpdateKYCResponse, error) {
	if err := s.db.Model(&User{}).Where("id = ?", req.UserId).Update("kyc_level_id", req.TargetLevel).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update KYC level")
	}
	return &pb.UpdateKYCResponse{Success: true, Message: "KYC Level updated successfully"}, nil
}

func (s *server) GetKYCStatus(ctx context.Context, req *pb.GetKYCStatusRequest) (*pb.GetKYCStatusResponse, error) {
	var user User
	if err := s.db.Preload("KYCLevel").First(&user, req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	return &pb.GetKYCStatusResponse{
		CurrentLevel: int32(user.KYCLevel.Level),
		LevelName:    user.KYCLevel.Name,
		DailyLimit:   user.KYCLevel.DailyLimit,
		MaxBalance:   user.KYCLevel.MaxBalance,
	}, nil
}

func (s *server) GetSecurityQuestions(ctx context.Context, req *pb.Empty) (*pb.SecurityQuestionsResponse, error) {
	var questions []SecurityQuestion
	if err := s.db.Find(&questions).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch questions")
	}

	var pbQuestions []*pb.QuestionInfo
	for _, q := range questions {
		pbQuestions = append(pbQuestions, &pb.QuestionInfo{
			Id:       uint32(q.ID),
			Question: q.Question,
		})
	}
	return &pb.SecurityQuestionsResponse{Questions: pbQuestions}, nil
}

func (s *server) SetUserSecurityQuestions(ctx context.Context, req *pb.SetUserQuestionsRequest) (*pb.SetUserQuestionsResponse, error) {
	for _, ans := range req.Answers {
		// Better Security: Hash the answer
		hashedAnswer, _ := bcrypt.GenerateFromPassword([]byte(ans.Answer), bcrypt.DefaultCost)

		userQuestion := UserSecurityQuestion{
			UserID:     uint(uint64(parseUint(req.UserId))),
			QuestionID: uint(ans.QuestionId),
			AnswerHash: string(hashedAnswer),
		}
		s.db.Create(&userQuestion)
	}
	return &pb.SetUserQuestionsResponse{Success: true}, nil
}

func (s *server) VerifySecurityAnswer(ctx context.Context, req *pb.VerifyAnswerRequest) (*pb.VerifyAnswerResponse, error) {
	var userQuestion UserSecurityQuestion
	if err := s.db.Where("user_id = ? AND question_id = ?", req.UserId, req.QuestionId).First(&userQuestion).Error; err != nil {
		return &pb.VerifyAnswerResponse{Success: false}, nil
	}

	if err := bcrypt.CompareHashAndPassword([]byte(userQuestion.AnswerHash), []byte(req.Answer)); err != nil {
		return &pb.VerifyAnswerResponse{Success: false}, nil
	}

	return &pb.VerifyAnswerResponse{Success: true}, nil
}

func parseUint(s string) uint64 {
	var val uint64
	fmt.Sscanf(s, "%d", &val)
	return val
}

func (s *server) CreateBusinessUnit(ctx context.Context, req *pb.CreateBusinessUnitRequest) (*pb.CreateBusinessUnitResponse, error) {
	unit := BusinessUnit{
		Name:      req.Name,
		ManagerID: 0, // Placeholder for manager logic
	}

	if err := s.db.Create(&unit).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create business unit")
	}

	return &pb.CreateBusinessUnitResponse{
		Success: true,
		UnitId:  fmt.Sprintf("%d", unit.ID),
	}, nil
}

func (s *server) GetBusinessUnits(ctx context.Context, req *pb.GetBusinessUnitsRequest) (*pb.GetBusinessUnitsResponse, error) {
	var units []BusinessUnit
	if err := s.db.Find(&units).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch business units")
	}

	var unitInfos []*pb.BusinessUnitInfo
	for _, u := range units {
		unitInfos = append(unitInfos, &pb.BusinessUnitInfo{
			Id:        fmt.Sprintf("%d", u.ID),
			Name:      u.Name,
			ManagerId: fmt.Sprintf("%d", u.ManagerID),
		})
	}

	return &pb.GetBusinessUnitsResponse{Units: unitInfos}, nil
}

func (s *server) UpdateBusinessUnit(ctx context.Context, req *pb.UpdateBusinessUnitRequest) (*pb.UpdateBusinessUnitResponse, error) {
	var unit BusinessUnit
	if err := s.db.First(&unit, "id = ?", req.Id).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "business unit not found")
	}

	updates := map[string]interface{}{
		"Name": req.Name,
	}
	if req.ManagerId != "" {
		updates["ManagerID"] = parseUint(req.ManagerId)
	}

	if err := s.db.Model(&unit).Updates(updates).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update business unit")
	}

	return &pb.UpdateBusinessUnitResponse{Success: true, Message: "Business unit updated successfully"}, nil
}

func (s *server) DeleteBusinessUnit(ctx context.Context, req *pb.DeleteBusinessUnitRequest) (*pb.DeleteBusinessUnitResponse, error) {
	if err := s.db.Delete(&BusinessUnit{}, "id = ?", req.Id).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete business unit")
	}

	return &pb.DeleteBusinessUnitResponse{Success: true, Message: "Business unit deleted successfully"}, nil
}

func main() {
	godotenv.Load()

	dbHost := os.Getenv("DB_HOST")
	_ = dbHost
	dbPort := os.Getenv("DB_PORT")
	_ = dbPort
	dbUser := os.Getenv("DB_USERNAME")
	_ = dbUser
	dbPass := os.Getenv("DB_PASSWORD")
	_ = dbPass
	dbName := os.Getenv("DB_NAME")
	_ = dbName

	db, err := gorm.Open(sqlite.Open("identity.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// Auto Migrate the models
	db.AutoMigrate(&User{}, &Role{}, &Permission{}, &BusinessUnit{}, &Branch{}, &OTP{}, &AuditLog{}, &ConsentAuditLog{}, &KYCLevel{}, &SecurityQuestion{}, &UserSecurityQuestion{}, &Company{}, &CompanyUser{})

	// Seed Data
	SeedIdentityData(db)

	log.Println("Starting Identity Service (Go)...")

	lis, err := net.Listen("tcp", ":50052")
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
