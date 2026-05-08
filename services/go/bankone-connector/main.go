package main

import (
	"log"
	"net"
	"os"

	pb "github.com/gdl/bankone-connector/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

func main() {
	godotenv.Load()

	authToken := os.Getenv("BANKONE_AUTHKEY")
	baseURL := os.Getenv("BANKONE_BASEURL")
	port := os.Getenv("PORT")
	if port == "" {
		port = "50056"
	}

	log.Println("Starting BankOne Connector Service (Go)...")

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	client := NewBankOneClient(baseURL, authToken)
	pb.RegisterBankOneServiceServer(s, &server{client: client})

	log.Printf("Server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
