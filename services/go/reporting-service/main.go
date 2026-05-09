package main

import (
	"context"
	"log"
	"net"
	"os"

	pb "reporting-service/proto"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type server struct {
	pb.UnimplementedReportingServiceServer
	db *gorm.DB
}

type ReconciliationException struct {
	ID            uint      `gorm:"primaryKey"`
	TransactionID string    `gorm:"index"`
	ExternalID    string    `gorm:"index"`
	Amount        float64   `json:"amount"`
	Reason        string    `json:"reason"` // e.g., "MISSING_IN_GDL", "AMOUNT_MISMATCH"
	Status        string    `gorm:"default:'OPEN'"`
	CreatedAt     time.Time `json:"created_at"`
}

func startReconciliationWorker(db *gorm.DB) {
	ticker := time.NewTicker(12 * time.Hour) // Run every 12 hours
	for range ticker.C {
		log.Println("Starting automated financial reconciliation...")
		// Logic to fetch BankOne data and compare with db.Table("transaction_logs")
		// would be implemented here, flagging discrepancies in ReconciliationException
	}
}

func (s *server) GetDashboardStats(ctx context.Context, req *pb.DashboardRequest) (*pb.DashboardResponse, error) {
	var flexiStats pb.FlexiStats
	var assetStats pb.AssetStats
	var generalStats pb.GeneralStats

	// 1. User Stats
	var totalUsers int64
	s.db.Table("user_accounts").Count(&totalUsers)
	generalStats.TotalUsers = int32(totalUsers)

	// 2. Flexi Stats (Raw SQL for speed)
	s.db.Raw(`
		SELECT 
			COALESCE(SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN amount ELSE 0 END), 0) as pending_amount,
			COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as disbursed_amount,
			COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN amount ELSE 0 END), 0) as rejected_amount,
			COUNT(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 END) as pending_count,
			COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as disbursed_count
		FROM flexi_requests
	`).Scan(&flexiStats)

	// 3. Asset Management (Simulated aggregate for now)
	assetStats.TotalAum = 5000000.00 // Example
	assetStats.TotalSubscribers = 1200

	return &pb.DashboardResponse{
		Flexi:           &flexiStats,
		AssetManagement: &assetStats,
		General:         &generalStats,
	}, nil
}

func (s *server) GetUserGrowth(ctx context.Context, req *pb.UserGrowthRequest) (*pb.UserGrowthResponse, error) {
	var points []*pb.GrowthPoint

	// Optimized SQL to get growth by date
	s.db.Raw(`
		SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count 
		FROM user_accounts 
		WHERE created_at >= NOW() - INTERVAL '7 days'
		GROUP BY date 
		ORDER BY date ASC
	`).Scan(&points)

	return &pb.UserGrowthResponse{Points: points}, nil
}

func main() {
	godotenv.Load()

	dsn := "host=" + os.Getenv("DB_HOST") + " user=" + os.Getenv("DB_USERNAME") + " password=" + os.Getenv("DB_PASSWORD") + " dbname=" + os.Getenv("DB_NAME") + " port=" + os.Getenv("DB_PORT") + " sslmode=require"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	db.AutoMigrate(&ReconciliationException{})
	go startReconciliationWorker(db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "50055"
	}

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	srv := grpc.NewServer()
	pb.RegisterReportingServiceServer(srv, &server{db: db})

	log.Printf("Reporting Service listening on :%s", port)
	if err := srv.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
