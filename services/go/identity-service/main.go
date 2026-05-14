package main

import (
	"fmt"
	"log"
	"net"
	"os"

	pb "github.com/gdl/identity-service/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// 1. Load Configuration
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbIdentityUser := os.Getenv("DB_USERNAME")
	dbPass := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	// 2. Database Connection
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local&tls=skip-verify",
		dbIdentityUser, dbPass, dbHost, dbPort, dbName)

	log.Printf("Connecting to database at %s:%s...", dbHost, dbPort)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("CRITICAL: Failed to connect to database: %v", err)
	}
	log.Println("Database connection successful.")

	// 3. Database Migrations & Seeding
	log.Println("Starting database migrations...")

	if err := db.AutoMigrate(
		&IdentityUser{}, &Role{}, &Permission{}, &BusinessUnit{}, &Branch{},
		&IdentityOTP{}, &IdentityAuditLog{}, &ConsentIdentityAuditLog{}, &KYCLevel{},
		&SecurityQuestion{}, &IdentityUserSecurityQuestion{}, &IdentityCompany{}, &IdentityCompanyIdentityUser{},
	); err != nil {
		log.Fatalf("CRITICAL: Database migration failed: %v", err)
	}
	log.Println("Database migrations completed successfully.")

	SeedIdentityData(db)

	// 4. Start gRPC Server
	port := os.Getenv("PORT")
	if port == "" || port == "3000" {
		port = "50051"
	}

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor),
	)

	// Register Services
	pb.RegisterIdentityServiceServer(s, &server{db: db})

	// Health & Reflection
	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(s, healthServer)
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	reflection.Register(s)

	log.Printf("Identity Service (Go) listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
