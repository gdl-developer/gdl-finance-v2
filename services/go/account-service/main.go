package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"

	pb "github.com/gdl/account-service/proto"
	bankone_pb "github.com/gdl/bankone-connector/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)


type server struct {
	pb.UnimplementedAccountServiceServer
	db      *gorm.DB
	clients *Clients
	redis   *RedisClient
}

func (s *server) GetBankOneBalance(ctx context.Context, req *pb.GetBalanceRequest) (*pb.GetBalanceResponse, error) {
	var account Account
	if err := s.db.Where("user_id = ?", req.UserId).First(&account).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "account not found")
	}
	return &pb.GetBalanceResponse{
		AccountNumber: account.BankOneAccount,
		Balance:       account.BankOneBalance,
		Currency:      account.Currency,
	}, nil
}

func (s *server) GetUBABalance(ctx context.Context, req *pb.GetBalanceRequest) (*pb.GetBalanceResponse, error) {
	var account Account
	if err := s.db.Where("user_id = ?", req.UserId).First(&account).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "account not found")
	}
	return &pb.GetBalanceResponse{
		AccountNumber: account.UBALedgerAccount,
		Balance:       account.UBALedgerBalance,
		Currency:      account.Currency,
	}, nil
}

func (s *server) GetRMBBalance(ctx context.Context, req *pb.GetBalanceRequest) (*pb.GetBalanceResponse, error) {
	var account Account
	if err := s.db.Where("user_id = ?", req.UserId).First(&account).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "account not found")
	}
	return &pb.GetBalanceResponse{
		AccountNumber: account.RMBAccount,
		Balance:       account.RMBBalance,
		Currency:      account.Currency,
	}, nil
}

func (s *server) GetAccount(ctx context.Context, req *pb.GetAccountRequest) (*pb.GetAccountResponse, error) {
	var account Account
	if err := s.db.Where("account_number = ?", req.AccountNumber).First(&account).Error; err != nil {
		return nil, status.Errorf(codes.NotFound, "account not found")
	}
	return &pb.GetAccountResponse{
		Id:            fmt.Sprintf("%d", account.ID),
		AccountNumber: account.BankOneAccount,
		UserId:        account.UserID,
		Status:        account.Status,
	}, nil
}

func (s *server) InitializeCBAAccounts(ctx context.Context, req *pb.InitializeCBARequest) (*pb.InitializeCBAResponse, error) {
	log.Printf("Initializing prioritized accounts for user: %s", req.UserId)

	// 1. Create BankOne Quick Account
	bankoneResp, err := s.clients.BankOne.CreateAccountQuick(ctx, &bankone_pb.CreateAccountQuickRequest{
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Email:       req.Email,
		Phone:       req.Phone,
		AccountType: "202",
	})

	nuban := ""
	if err == nil {
		var bankoneData map[string]interface{}
		json.Unmarshal([]byte(bankoneResp.Data), &bankoneData)
		if msg, ok := bankoneData["Message"].(map[string]interface{}); ok {
			nuban, _ = msg["BankoneAccountNumber"].(string)
		}
	}

	// 2. Save to Shadow Ledger
	newAccount := Account{
		UserID:           req.UserId,
		BankOneAccount:   nuban,
		BankOneBalance:   0.0,
		UBALedgerAccount: "UBA-VIRT-" + req.UserId,
		RMBAccount:       "RMB-VIRT-" + req.UserId,
		Currency:         "NGN",
		Status:           "ACTIVE",
	}
	s.db.Create(&newAccount)

	return &pb.InitializeCBAResponse{
		Success:      true,
		Message:      "Prioritized accounts initialized successfully",
		BankoneNuban: nuban,
	}, nil
}

func main() {
	godotenv.Load()
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=require",
		os.Getenv("DB_HOST"), os.Getenv("DB_USERNAME"), os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"), os.Getenv("DB_PORT"))

	db, _ := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	db.AutoMigrate(&Account{}, &BalanceSyncLog{}, &TransactionAuditLog{})

	rdb := InitRedis()
	go StartKafkaConsumer(db, rdb)
	clients := InitClients()

	lis, _ := net.Listen("tcp", ":50051")
	s := grpc.NewServer()

	// Register services
	pb.RegisterAccountServiceServer(s, &server{db: db, clients: clients, redis: rdb})

	// Register Health Service
	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(s, healthServer)
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)

	reflection.Register(s)
	s.Serve(lis)
}
