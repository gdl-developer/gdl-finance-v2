package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"time"

	pb "github.com/gdl/compliance-service/proto"

	"github.com/joho/godotenv"
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

type ComplianceStatus struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    string    `gorm:"uniqueIndex"`
	KYCLevel  int       `json:"kyc_level"`
	AMLStatus string    `json:"aml_status"` // e.g., "CLEARED", "FLAGGED", "PENDING"
	LastCheck time.Time `json:"last_check"`
}

type SanctionMatch struct {
	ID           uint      `gorm:"primaryKey"`
	UserID       string    `gorm:"index"`
	MatchSource  string    `json:"match_source"` // e.g., "UN_SANCTIONS", "OFAC"
	MatchDetails string    `gorm:"type:text"`
	Resolved     bool      `gorm:"default:false"`
	CreatedAt    time.Time `json:"created_at"`
}

type server struct {
	pb.UnimplementedComplianceServiceServer
	db *gorm.DB
}

func (s *server) VerifyBVN(ctx context.Context, req *pb.VerifyBVNRequest) (*pb.VerifyBVNResponse, error) {
	log.Printf("Verifying BVN: %s for %s %s", req.Bvn, req.FirstName, req.LastName)
	return &pb.VerifyBVNResponse{
		Verified:    true,
		Message:     "BVN verified successfully (Simulated)",
		FullName:    req.FirstName + " " + req.LastName,
		DateOfBirth: "1990-01-01",
	}, nil
}

func (s *server) VerifyNIN(ctx context.Context, req *pb.VerifyNINRequest) (*pb.VerifyNINResponse, error) {
	log.Printf("Verifying NIN: %s", req.Nin)
	return &pb.VerifyNINResponse{
		Verified: true,
		Message:  "NIN verified successfully (Simulated)",
	}, nil
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
	db.AutoMigrate(&ComplianceStatus{}, &SanctionMatch{})

	port := os.Getenv("PORT")
	if port == "" {
		port = "50055"
	}

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor),
	)
	pb.RegisterComplianceServiceServer(s, &server{db: db})
	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(s, healthServer)
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	reflection.Register(s)

	log.Printf("Compliance Service listening on :%s", port)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
