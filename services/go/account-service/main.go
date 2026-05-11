package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"

	bankone_pb "github.com/gdl/bankone-connector/proto"
	pb "github.com/gdl/account-service/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type server struct {
	pb.UnimplementedAccountServiceServer
	db      *gorm.DB
	clients *Clients
	redis   *RedisClient
}

type Clients struct {
	bankone bankone_pb.BankOneServiceClient
}

func (s *server) GetBalance(ctx context.Context, req *pb.GetBalanceRequest) (*pb.BalanceResponse, error) {
	var account Account
	if err := s.db.Where("user_id = ?", req.UserId).First(&account).Error; err != nil {
		return &pb.BalanceResponse{Success: false, Message: "Account not found"}, nil
	}
	return &pb.BalanceResponse{
		Success:       true,
		UserId:        req.UserId,
		AccountNumber: account.AccountNumber,
		AvailableBalance: account.Balance,
		LedgerBalance:    account.Balance,
	}, nil
}

func (s *server) GetBankOneBalance(ctx context.Context, req *pb.GetBalanceRequest) (*pb.BalanceResponse, error) {
	// 1. Get local account details
	var account Account
	if err := s.db.Where("user_id = ?", req.UserId).First(&account).Error; err != nil {
		return nil, fmt.Errorf("account not found")
	}

	// 2. Fetch real-time balance from BankOne
	resp, err := s.clients.bankone.GetAccountDetails(ctx, &bankone_pb.AccountRequest{
		AccountNumber: account.AccountNumber,
	})
	if err != nil {
		return nil, err
	}

	return &pb.BalanceResponse{
		Success:       true,
		UserId:        req.UserId,
		AccountNumber: account.AccountNumber,
		AvailableBalance: resp.AvailableBalance,
		LedgerBalance:    resp.LedgerBalance,
	}, nil
}

func (s *server) GetAccountTransactions(ctx context.Context, req *pb.TransactionRequest) (*pb.TransactionResponse, error) {
	return &pb.TransactionResponse{Success: true}, nil
}

func (s *server) SyncBalance(ctx context.Context, req *pb.SyncRequest) (*pb.SyncResponse, error) {
	return &pb.SyncResponse{Success: true}, nil
}

type Account struct {
	ID            uint    `gorm:"primaryKey"`
	UserId        string  `gorm:"unique;not null"`
	AccountNumber string  `gorm:"unique;not null"`
	Balance       float64 `gorm:"default:0"`
	Status        string  `gorm:"default:ACTIVE"`
}

type BalanceSyncLog struct {
	ID        uint   `gorm:"primaryKey"`
	UserId    string `gorm:"not null"`
	OldBalance float64
	NewBalance float64
	Timestamp  int64
}

type TransactionAuditLog struct {
	ID        uint   `gorm:"primaryKey"`
	UserId    string `gorm:"not null"`
	Type      string `gorm:"not null"`
	Amount    float64
	Timestamp int64
}

func InitClients() *Clients {
	conn, err := grpc.Dial("localhost:50054", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("failed to connect bankone: %v", err)
	}
	return &Clients{
		bankone: bankone_pb.NewBankOneServiceClient(conn),
	}
}

func main() {
	godotenv.Load()
	
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USERNAME")
	dbPass := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=require",
		dbUser, dbPass, dbHost, dbPort, dbName)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	
	db.AutoMigrate(&Account{}, &BalanceSyncLog{}, &TransactionAuditLog{})

	rdb := InitRedis()
	go StartKafkaConsumer(db, rdb)
	clients := InitClients()

	port := os.Getenv("PORT")
	if port == "" {
		port = "50051"
	}

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	
	s := grpc.NewServer()

	// Register services
	pb.RegisterAccountServiceServer(s, &server{db: db, clients: clients, redis: rdb})

	log.Printf("Account Service listening on :%s", port)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

// Mock Redis Init
type RedisClient struct{}
func InitRedis() *RedisClient { return &RedisClient{} }
func StartKafkaConsumer(db *gorm.DB, rdb *RedisClient) {}
