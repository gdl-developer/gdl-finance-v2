package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"time"

	account_pb "github.com/gdl/account-service/proto"
	bankone_pb "github.com/gdl/bankone-connector/proto"
	identity_pb "github.com/gdl/identity-service/proto"
	pb "github.com/gdl/transaction-service/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
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

// withInternalAuth adds the internal security key to the context metadata
func withInternalAuth(ctx context.Context) context.Context {
	return metadata.AppendToOutgoingContext(ctx, "x-internal-secret", os.Getenv("INTERNAL_SECURITY_KEY"))
}

type server struct {
	pb.UnimplementedTransactionServiceServer
	db       *gorm.DB
	identity identity_pb.IdentityServiceClient
	account  account_pb.AccountServiceClient
	bankone  bankone_pb.BankOneServiceClient
}

func (s *server) TransferBank(ctx context.Context, req *pb.BankTransferRequest) (*pb.TransferResponse, error) {
	log.Printf("Bank transfer request from %s: %f to %s", maskPII(req.FromUserId), req.Amount, maskPII(req.AccountNumber))

	ctx = withInternalAuth(ctx)

	// 1. SECURE: Verify Transaction PIN (MFA)
	pinResp, err := s.identity.VerifyPIN(ctx, &identity_pb.VerifyPINRequest{
		UserId: req.FromUserId,
		Pin:    req.Pin,
		Type:   "TRANSACTION",
	})
	if err != nil || !pinResp.Success {
		return &pb.TransferResponse{Success: false, Message: "Unauthorized: Invalid Transaction PIN"}, nil
	}

	// 2. COMPLIANCE: Verify KYC Limits (CBN Compliance)
	kycStatus, err := s.identity.GetKYCStatus(ctx, &identity_pb.GetKYCStatusRequest{UserId: req.FromUserId})
	if err == nil {
		if req.Amount > kycStatus.DailyLimit {
			return &pb.TransferResponse{Success: false, Message: fmt.Sprintf("Amount exceeds your daily limit of ₦%.2f", kycStatus.DailyLimit)}, nil
		}
	}

	// 3. GET PAYER DETAILS: Call Identity-Service
	profile, err := s.identity.GetProfile(ctx, &identity_pb.GetProfileRequest{UserId: req.FromUserId})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to retrieve payer profile")
	}
	payerName := fmt.Sprintf("%s %s", profile.FirstName, profile.LastName)

	// 4. GET SOURCE ACCOUNT: Call Account-Service
	account, err := s.account.GetBankOneBalance(ctx, &account_pb.GetBalanceRequest{UserId: req.FromUserId})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to retrieve source account")
	}

	// 5. EXECUTE: Call BankOne Interbank Transfer (NIP)
	bankoneResp, err := s.bankone.InterbankTransfer(ctx, &bankone_pb.InterbankTransferRequest{
		Amount:                fmt.Sprintf("%.2f", req.Amount),
		PayerAccountNumber:    account.AccountNumber,
		PayerName:             payerName,
		ReceiverBankCode:      req.BankCode,
		ReceiverAccountNumber: req.AccountNumber,
		ReceiverName:          req.ReceiverName,
		ReceiverPhoneNumber:   req.ReceiverPhone,
		ReceiverAccountType:   req.ReceiverAccountType,
		ReceiverKyc:           req.ReceiverKyc,
		ReceiverBvn:           req.ReceiverBvn,
		Narration:             req.Narration,
		Reference:             fmt.Sprintf("TRF-%d", time.Now().UnixNano()),
	})

	if err != nil || !bankoneResp.Success {
		// Log Failed Transaction
		s.db.Create(&Transaction{
			UserID:         uint(parseUint(req.FromUserId)),
			TxnRef:         fmt.Sprintf("FAIL-%d", time.Now().UnixNano()),
			RequestRef:     fmt.Sprintf("REQ-%d", time.Now().UnixNano()),
			Amount:         req.Amount,
			Type:           "DEBIT",
			Status:         "FAILED",
			InternalStatus: "FAILED",
			Narration:      req.Narration,
			CreatedAt:      time.Now(),
		})
		return &pb.TransferResponse{Success: false, Message: "BankOne Transfer Failed: " + bankoneResp.Message}, nil
	}

	// 6. LOG SUCCESS: Save to V1 Compatible Table
	s.db.Create(&Transaction{
		UserID:           uint(parseUint(req.FromUserId)),
		TxnRef:           bankoneResp.Message, // Assuming BankOne returns ref here
		RequestRef:       fmt.Sprintf("REQ-%d", time.Now().UnixNano()),
		Amount:           req.Amount,
		Type:             "DEBIT",
		Status:           "COMPLETED",
		InternalStatus:   "COMPLETED",
		Narration:        req.Narration,
		RecipientAccount: req.AccountNumber,
		RecipientName:    req.ReceiverName,
		CreatedAt:        time.Now(),
	})

	return &pb.TransferResponse{
		Success:        true,
		Message:        "Interbank Transfer successful",
		TransactionRef: bankoneResp.Message,
	}, nil
}

func (s *server) TransactionStatusQuery(ctx context.Context, req *pb.TSQRequest) (*pb.TransferResponse, error) {
	resp, err := s.bankone.TransactionStatusQuery(ctx, &bankone_pb.TSQRequest{
		RetrievalReference: req.Reference,
		TransactionDate:    req.Date,
		TransactionType:    "InterbankTransfer",
		Amount:             fmt.Sprintf("%.2f", req.Amount),
	})
	if err != nil || !resp.Success {
		return &pb.TransferResponse{Success: false, Message: "TSQ Failed: " + resp.Message}, nil
	}

	return &pb.TransferResponse{
		Success:        true,
		Message:        "Transaction status retrieved: " + resp.Message,
		TransactionRef: req.Reference,
	}, nil
}

func (s *server) TransferInternal(ctx context.Context, req *pb.TransferRequest) (*pb.TransferResponse, error) {
	log.Printf("Internal transfer from %s to %s: %f", maskPII(req.FromUserId), maskPII(req.ToAccount), req.Amount)

	ctx = withInternalAuth(ctx)

	// 1. SECURE: Verify Transaction PIN
	pinResp, err := s.identity.VerifyPIN(ctx, &identity_pb.VerifyPINRequest{
		UserId: req.FromUserId,
		Pin:    req.Pin,
		Type:   "TRANSACTION",
	})
	if err != nil || !pinResp.Success {
		return &pb.TransferResponse{Success: false, Message: "Unauthorized: Invalid Transaction PIN"}, nil
	}

	return &pb.TransferResponse{
		Success:        true,
		Message:        "Internal Transfer successful",
		TransactionRef: fmt.Sprintf("INT-%d", time.Now().UnixNano()),
	}, nil
}

func (s *server) GetBankList(ctx context.Context, req *pb.Empty) (*pb.BankListResponse, error) {
	_, err := s.bankone.GetOtherBankList(ctx, &bankone_pb.Empty{})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch bank list")
	}

	// Logic to parse bankoneResp.Data into pb.BankListResponse
	// For now returning mock/empty success
	return &pb.BankListResponse{}, nil
}

func (s *server) AccountEnquiry(ctx context.Context, req *pb.EnquiryRequest) (*pb.EnquiryResponse, error) {
	ctx = withInternalAuth(ctx)
	resp, err := s.bankone.AccountEnquiry(ctx, &bankone_pb.AccountEnquiryRequest{
		AccountNumber: req.AccountNumber,
	})
	if err != nil || (resp != nil && !resp.Success) {
		return &pb.EnquiryResponse{Success: false, Message: "Account not found"}, nil
	}

	return &pb.EnquiryResponse{
		Success:     true,
		AccountName: resp.Message, // BankOne usually puts name in message/data
	}, nil
}

func parseUint(s string) uint64 {
	var val uint64
	fmt.Sscanf(s, "%d", &val)
	return val
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

	db, _ := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	db.AutoMigrate(&Transaction{})

	port := os.Getenv("PORT")
	if port == "" {
		port = "50060"
	}

	// Connect to Identity Service
	identityUrl := os.Getenv("IDENTITY_SERVICE_URL")
	if identityUrl == "" {
		identityUrl = "localhost:50051"
	}
	connID, _ := grpc.Dial(identityUrl, grpc.WithTransportCredentials(insecure.NewCredentials()))
	identityClient := identity_pb.NewIdentityServiceClient(connID)

	// Connect to Account Service
	accountUrl := os.Getenv("ACCOUNT_SERVICE_URL")
	if accountUrl == "" {
		accountUrl = "localhost:50052"
	}
	connAcc, _ := grpc.Dial(accountUrl, grpc.WithTransportCredentials(insecure.NewCredentials()))
	accountClient := account_pb.NewAccountServiceClient(connAcc)

	// Connect to BankOne Connector
	bankoneUrl := os.Getenv("BANKONE_SERVICE_ADDR")
	if bankoneUrl == "" {
		bankoneUrl = "localhost:50054"
	}
	connBankone, _ := grpc.Dial(bankoneUrl, grpc.WithTransportCredentials(insecure.NewCredentials()))
	bankoneClient := bankone_pb.NewBankOneServiceClient(connBankone)

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor),
	)
	pb.RegisterTransactionServiceServer(s, &server{
		db:       db,
		identity: identityClient,
		account:  accountClient,
		bankone:  bankoneClient,
	})
	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(s, healthServer)
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	reflection.Register(s)

	log.Printf("Transaction Service listening on :%s", port)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
