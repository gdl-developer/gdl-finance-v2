package main

import (
	"fmt"
	"log"
	"net"
	"os"

	pb "github.com/gdl/audit-service/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type server struct {
	pb.UnimplementedAuditServiceServer
	db *gorm.DB
}

type AuditLog struct {
	ID        uint   `gorm:"primaryKey"`
	UserId    string `gorm:"not null"`
	Action    string `gorm:"not null"`
	Metadata  string
	Timestamp int64
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
	
	db.AutoMigrate(&AuditLog{})

	log.Println("Starting Audit Service (Go)...")

	port := os.Getenv("PORT")
	if port == "" {
		port = "50058"
	}

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	
	s := grpc.NewServer()
	pb.RegisterAuditServiceServer(s, &server{db: db})

	log.Printf("Server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
