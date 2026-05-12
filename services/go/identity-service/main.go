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
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// maskPII redacts sensitive info for logs
func maskPII(input string) string {
	if len(input) <= 4 {
		return "****"
	}
	return input[:2] + "****" + input[len(input)-2:]
}

func authInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Errorf(codes.Unauthenticated, "metadata is not provided")
	}

	secret := md["x-internal-secret"]
	expectedSecret := os.Getenv("INTERNAL_SECURITY_KEY")

	if len(secret) == 0 || secret[0] != expectedSecret {
		log.Printf("Unauthorized internal access attempt to %s", info.FullMethod)
		return nil, status.Errorf(codes.Unauthenticated, "invalid internal security key")
	}

	return handler(ctx, req)
}

type server struct {
	pb.UnimplementedIdentityServiceServer
	db *gorm.DB
}

func (s *server) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to hash password")
	}
	user := User{
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Email:        req.Email,
		PhoneNumber:  req.PhoneNumber,
		PasswordHash: string(hashedPassword),
		Status:       "ACTIVE",
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create user")
	}

	return &pb.RegisterResponse{
		Success: true,
		UserId:  fmt.Sprintf("%d", user.ID),
		Message: "User registered successfully",
	}, nil
}

func (s *server) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	var user User
	if err := s.db.Preload("Role").Where("email = ?", req.Email).First(&user).Error; err != nil {
		return &pb.LoginResponse{Success: false, Message: "Invalid credentials"}, nil
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return &pb.LoginResponse{Success: false, Message: "Invalid credentials"}, nil
	}

	token, err := GenerateToken(fmt.Sprintf("%d", user.ID), user.Role.Name)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate token")
	}

	// For now, we use a similar token as refresh token
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

func (s *server) GetProfile(ctx context.Context, req *pb.GetProfileRequest) (*pb.GetProfileResponse, error) {
	var user User
	if err := s.db.Preload("Role.Permissions").First(&user, req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	var permissions []string
	for _, p := range user.Role.Permissions {
		permissions = append(permissions, p.Name)
	}

	return &pb.GetProfileResponse{
		Email:       user.Email,
		FirstName:   user.FirstName,
		LastName:    user.LastName,
		PhoneNumber: user.PhoneNumber,
		Status:      user.Status,
		UserType:    user.AccountType,
		Role: &pb.RoleInfo{
			Id:          fmt.Sprintf("%d", user.Role.ID),
			Name:        user.Role.Name,
			Permissions: permissions,
		},
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

func (s *server) ExportData(ctx context.Context, req *pb.ExportDataRequest) (*pb.ExportDataResponse, error) {
	var user User
	if err := s.db.Preload("Role").First(&user, req.UserId).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	return &pb.ExportDataResponse{
		JsonData: fmt.Sprintf(`{"email": "%s", "first_name": "%s", "last_name": "%s"}`, user.Email, user.FirstName, user.LastName),
	}, nil
}

func (s *server) DeleteAccount(ctx context.Context, req *pb.DeleteAccountRequest) (*pb.DeleteAccountResponse, error) {
	if err := s.db.Model(&User{}).Where("id = ?", req.UserId).Update("is_deleted", true).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete account")
	}
	return &pb.DeleteAccountResponse{Success: true, Message: "Account marked for deletion"}, nil
}

func (s *server) UpdateConsent(ctx context.Context, req *pb.UpdateConsentRequest) (*pb.UpdateConsentResponse, error) {
	updates := map[string]interface{}{
		"terms_accepted":          req.TermsAccepted,
		"privacy_policy_accepted": req.PrivacyPolicyAccepted,
		"marketing_consent":       req.MarketingConsent,
		"policy_version":          req.PolicyVersion,
		"consent_timestamp":       time.Now(),
	}

	if err := s.db.Model(&User{}).Where("id = ?", req.UserId).Updates(updates).Error; err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update consent")
	}

	return &pb.UpdateConsentResponse{Success: true, Message: "Consent updated successfully"}, nil
}

func parseUint(s string) uint64 {
	var val uint64
	fmt.Sscanf(s, "%d", &val)
	return val
}

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

func main() {
	godotenv.Load()

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USERNAME")
	dbPass := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local&tls=skip-verify",
		dbUser, dbPass, dbHost, dbPort, dbName)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	db.AutoMigrate(&User{}, &Role{}, &Permission{}, &BusinessUnit{}, &Branch{}, &OTP{}, &AuditLog{}, &ConsentAuditLog{}, &KYCLevel{}, &SecurityQuestion{}, &UserSecurityQuestion{}, &Company{}, &CompanyUser{})
	SeedIdentityData(db)

	log.Println("Starting Identity Service (Go)...")

	port := os.Getenv("PORT")
	if port == "" || port == "3000" {
		port = "50051"
	}
	log.Printf("Identity Service configuring to listen on port: %s", port)

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor),
	)
	pb.RegisterIdentityServiceServer(s, &server{db: db})
	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(s, healthServer)
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	reflection.Register(s)

	log.Printf("Server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
