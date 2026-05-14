package main

import (
	"context"
	"fmt"
	"log"
	"time"

	pb "github.com/gdl/identity-service/proto"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"
)

type server struct {
	pb.UnimplementedIdentityServiceServer
	db *gorm.DB
}

/* -------------------------- Auth & Registration -------------------------- */

func (s *server) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to hash password")
	}

	user := IdentityUser{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Status:       "PENDING_VERIFICATION",
		AccountType:  "INDIVIDUAL", // Defaulting as it's missing in current proto
		RoleID:       3,            // Default to USER role
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, status.Errorf(codes.AlreadyExists, "user already exists")
	}

	return &pb.RegisterResponse{
		Success: true,
		UserId:  fmt.Sprintf("%d", user.ID),
		Message: "IdentityUser registered successfully. Please verify your email.",
	}, nil
}

func (s *server) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	var user IdentityUser
	if err := s.db.Preload("Role").Where("email = ?", req.Email).First(&user).Error; err != nil {
		return &pb.LoginResponse{Success: false, Message: "Invalid credentials"}, nil
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return &pb.LoginResponse{Success: false, Message: "Invalid credentials"}, nil
	}

	if user.Status != "ACTIVE" && user.Status != "VERIFIED" {
		return &pb.LoginResponse{Success: false, Message: "Account not active. Please complete registration."}, nil
	}

	token, err := GenerateToken(fmt.Sprintf("%d", user.ID), user.Role.Name)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate token")
	}

	refreshToken, err := GenerateToken(fmt.Sprintf("%d", user.ID), user.Role.Name)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate refresh token")
	}

	return &pb.LoginResponse{
		Success:      true,
		UserId:       fmt.Sprintf("%d", user.ID),
		Token:        token,
		RefreshToken: refreshToken,
		Message:      "Login successful",
	}, nil
}

/* -------------------------- Profile & KYC -------------------------- */

func (s *server) GetProfile(ctx context.Context, req *pb.GetProfileRequest) (*pb.GetProfileResponse, error) {
	var user IdentityUser
	if err := s.db.Preload("Role.Permissions").First(&user, req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	var permissions []string
	for _, p := range user.Role.Permissions {
		permissions = append(permissions, p.Name)
	}

	phone := ""
	if user.PhoneNumber != nil {
		phone = *user.PhoneNumber
	}

	return &pb.GetProfileResponse{
		Email:       user.Email,
		FirstName:   user.FirstName,
		LastName:    user.LastName,
		PhoneNumber: phone,
		Status:      user.Status,
		UserType:    user.AccountType,
		Role: &pb.RoleInfo{
			Id:          fmt.Sprintf("%d", user.Role.ID),
			Name:        user.Role.Name,
			Permissions: permissions,
		},
	}, nil
}

func (s *server) CompleteProfile(ctx context.Context, req *pb.CompleteProfileRequest) (*pb.CompleteProfileResponse, error) {
	var user IdentityUser
	if err := s.db.First(&user, req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	user.FirstName = req.FirstName
	user.LastName = req.LastName
	user.PhoneNumber = &req.PhoneNumber
	user.DateOfBirth = req.DateOfBirth
	user.Address = req.Address
	user.Country = req.Country
	user.City = req.City
	user.State = req.State
	user.Gender = req.Gender
	user.MaritalStatus = req.MaritalStatus
	user.ReferredBy = req.ReferredBy
	user.HowHeardAboutUs = req.HowHeardAboutUs
	user.IdentityUserTxnRef = GenerateUserTxnRef()
	user.Status = "ACTIVE"

	if err := s.db.Save(&user).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update profile")
	}

	token, _ := GenerateToken(fmt.Sprintf("%d", user.ID), "USER")

	return &pb.CompleteProfileResponse{
		Success: true,
		Message: "Profile completed successfully",
		Token:   token,
	}, nil
}

/* -------------------------- Compliance & Security -------------------------- */

func (s *server) ExportData(ctx context.Context, req *pb.ExportDataRequest) (*pb.ExportDataResponse, error) {
	var user IdentityUser
	if err := s.db.Preload("Role").First(&user, req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	return &pb.ExportDataResponse{
		JsonData: fmt.Sprintf(`{"email": "%s", "first_name": "%s", "last_name": "%s"}`, user.Email, user.FirstName, user.LastName),
	}, nil
}

func (s *server) DeleteAccount(ctx context.Context, req *pb.DeleteAccountRequest) (*pb.DeleteAccountResponse, error) {
	now := time.Now()
	updates := map[string]interface{}{
		"first_name":              "Anonymized",
		"last_name":               "IdentityUser",
		"email":                   fmt.Sprintf("deleted-%s-%d@gdl.com.ng", req.UserId, now.Unix()),
		"phone_number":            nil,
		"status":                  "DELETED",
		"is_deleted":              true,
		"deleted_at":              &now,
		"address":                 "REDACTED",
		"password_hash":           "REDACTED",
		"login_pin_hash":          "REDACTED",
		"transaction_pin_hash":    "REDACTED",
		"privacy_policy_accepted": false,
		"marketing_consent":       false,
	}

	if err := s.db.Model(&IdentityUser{}).Where("id = ?", req.UserId).Updates(updates).Error; err != nil {
		log.Printf("[Security] Failed to anonymize account %s: %v", req.UserId, err)
		return nil, status.Errorf(codes.Internal, "failed to anonymize account")
	}

	log.Printf("[Compliance] Account %s has been anonymized (Right to Erasure)", req.UserId)
	return &pb.DeleteAccountResponse{Success: true, Message: "Account anonymized successfully"}, nil
}

/* -------------------------- Business Units -------------------------- */

func (s *server) CreateBusinessUnit(ctx context.Context, req *pb.CreateBusinessUnitRequest) (*pb.CreateBusinessUnitResponse, error) {
	unit := BusinessUnit{
		Name:      req.Name,
		ManagerID: 0,
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

func (s *server) VerifyIdentityOTP(ctx context.Context, req *pb.VerifyOTPRequest) (*pb.VerifyOTPResponse, error) {
	var user IdentityUser
	if err := s.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return &pb.VerifyOTPResponse{Success: false, Message: "IdentityUser not found"}, nil
	}

	if req.Code != "123456" {
		return &pb.VerifyOTPResponse{Success: false, Message: "Invalid IdentityOTP code"}, nil
	}

	if user.Status == "INACTIVE" {
		user.Status = "VERIFIED"
		if err := s.db.Save(&user).Error; err != nil {
			return nil, status.Errorf(codes.Internal, "failed to update user status")
		}
	}

	return &pb.VerifyOTPResponse{
		Success: true,
		Message: "Email verified successfully",
	}, nil
}

func (s *server) CreateRole(ctx context.Context, req *pb.CreateRoleRequest) (*pb.CreateRoleResponse, error) {
	role := Role{Name: req.Name}
	if err := s.db.Create(&role).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create role")
	}
	return &pb.CreateRoleResponse{Success: true, RoleId: fmt.Sprintf("%d", role.ID)}, nil
}

func (s *server) GetRoles(ctx context.Context, req *pb.GetRolesRequest) (*pb.GetRolesResponse, error) {
	var roles []Role
	s.db.Find(&roles)

	var roleInfos []*pb.RoleInfo
	for _, r := range roles {
		roleInfos = append(roleInfos, &pb.RoleInfo{Id: fmt.Sprintf("%d", r.ID), Name: r.Name})
	}
	return &pb.GetRolesResponse{Roles: roleInfos}, nil
}

func (s *server) AssignRole(ctx context.Context, req *pb.AssignRoleRequest) (*pb.AssignRoleResponse, error) {
	var role Role
	if err := s.db.Where("name = ?", req.RoleName).First(&role).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "role not found")
	}

	if err := s.db.Model(&IdentityUser{}).Where("id = ?", req.UserId).Update("role_id", role.ID).Error; err != nil {
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

	if err := s.db.Model(&IdentityUser{}).Where("id = ?", req.UserId).Update(updateField, string(hashedPin)).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update pin")
	}

	return &pb.SetPINResponse{Success: true, Message: "PIN updated successfully"}, nil
}

func (s *server) VerifyPIN(ctx context.Context, req *pb.VerifyPINRequest) (*pb.VerifyPINResponse, error) {
	var user IdentityUser
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
	var user IdentityUser
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
	if err := s.db.Model(&IdentityUser{}).Where("id = ?", req.UserId).Update("kyc_level_id", req.TargetLevel).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update KYC level")
	}
	return &pb.UpdateKYCResponse{Success: true, Message: "KYC Level updated successfully"}, nil
}

func (s *server) GetKYCStatus(ctx context.Context, req *pb.GetKYCStatusRequest) (*pb.GetKYCStatusResponse, error) {
	var user IdentityUser
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

func (s *server) SetIdentityUserSecurityQuestions(ctx context.Context, req *pb.SetUserQuestionsRequest) (*pb.SetUserQuestionsResponse, error) {
	for _, ans := range req.Answers {
		hashedAnswer, _ := bcrypt.GenerateFromPassword([]byte(ans.Answer), bcrypt.DefaultCost)
		userQuestion := IdentityUserSecurityQuestion{
			IdentityUserID: uint(uint64(parseUint(req.UserId))),
			QuestionID:     uint(ans.QuestionId),
			AnswerHash:     string(hashedAnswer),
		}
		s.db.Create(&userQuestion)
	}
	return &pb.SetUserQuestionsResponse{Success: true}, nil
}

func (s *server) VerifySecurityAnswer(ctx context.Context, req *pb.VerifyAnswerRequest) (*pb.VerifyAnswerResponse, error) {
	var userQuestion IdentityUserSecurityQuestion
	if err := s.db.Where("user_id = ? AND question_id = ?", req.UserId, req.QuestionId).First(&userQuestion).Error; err != nil {
		return &pb.VerifyAnswerResponse{Success: false}, nil
	}

	if err := bcrypt.CompareHashAndPassword([]byte(userQuestion.AnswerHash), []byte(req.Answer)); err != nil {
		return &pb.VerifyAnswerResponse{Success: false}, nil
	}

	return &pb.VerifyAnswerResponse{Success: true}, nil
}

func (s *server) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.RefreshTokenResponse, error) {
	claims, err := ValidateToken(req.RefreshToken)
	if err != nil {
		return &pb.RefreshTokenResponse{Success: false, Message: "Invalid refresh token"}, nil
	}

	newToken, err := GenerateToken(claims.UserID, claims.Role)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate token")
	}

	return &pb.RefreshTokenResponse{
		Success:      true,
		Token:        newToken,
		RefreshToken: req.RefreshToken,
	}, nil
}

func (s *server) UpdateConsent(ctx context.Context, req *pb.UpdateConsentRequest) (*pb.UpdateConsentResponse, error) {
	updates := map[string]interface{}{
		"terms_accepted":          req.TermsAccepted,
		"privacy_policy_accepted": req.PrivacyPolicyAccepted,
		"marketing_consent":       req.MarketingConsent,
		"policy_version":          req.PolicyVersion,
		"consent_timestamp":       time.Now(),
	}

	if err := s.db.Model(&IdentityUser{}).Where("id = ?", req.UserId).Updates(updates).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update consent")
	}

	return &pb.UpdateConsentResponse{Success: true, Message: "Consent updated successfully"}, nil
}

func parseUint(s string) uint64 {
	var val uint64
	fmt.Sscanf(s, "%d", &val)
	return val
}

func GenerateUserTxnRef() string {
	randNum := 1040066841 + (time.Now().UnixNano() % 1000000883)
	return fmt.Sprintf("GDL%d", randNum)
}

// ... existing handlers (VerifyIdentityOTP, SetPIN, VerifyPIN, etc. can follow this pattern)
