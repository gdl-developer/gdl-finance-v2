package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"time"

	pb "github.com/gdl/reporting-service/proto"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"gorm.io/driver/mysql"
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
	}
}

func (s *server) GetDashboardStats(ctx context.Context, req *pb.DashboardRequest) (*pb.DashboardResponse, error) {
	var flexiStats pb.FlexiStats
	var assetStats pb.AssetStats
	var generalStats pb.GeneralStats

	var totalUsers int64
	s.db.Table("user_accounts").Count(&totalUsers)
	generalStats.TotalUsers = int32(totalUsers)

	s.db.Raw(`
		SELECT 
			COALESCE(SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN amount ELSE 0 END), 0) as pending_amount,
			COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as disbursed_amount,
			COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN amount ELSE 0 END), 0) as rejected_amount,
			COUNT(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 END) as pending_count,
			COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as disbursed_count
		FROM flexi_requests
	`).Scan(&flexiStats)

	assetStats.TotalAum = 5000000.00
	assetStats.TotalSubscribers = 1200

	return &pb.DashboardResponse{
		Flexi:           &flexiStats,
		AssetManagement: &assetStats,
		General:         &generalStats,
	}, nil
}

func (s *server) GetUserGrowth(ctx context.Context, req *pb.UserGrowthRequest) (*pb.UserGrowthResponse, error) {
	var points []*pb.GrowthPoint
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
