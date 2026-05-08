package main

import (
	"log"
	"net"
	"os"

	pb "github.com/gdl/symplus-service/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

func main() {
	godotenv.Load()

	baseURL := os.Getenv("SYMPLUS_BASEURL")
	clientKey := os.Getenv("SYMPLUS_CLIENT_KEY")
	privateKey := os.Getenv("SYMPLUS_PRIVATE_KEY")
	publicKey := os.Getenv("SYMPLUS_PUBLIC_KEY")
	port := os.Getenv("PORT")
	if port == "" {
		port = "50055"
	}

	log.Println("Starting Symplus Connector Service (Go)...")

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	client := NewSymplusClient(baseURL, clientKey, privateKey, publicKey)

	// Start background key refresher
	go client.StartKeyRefresher()

	s := grpc.NewServer()
	pb.RegisterSymplusServiceServer(s, &server{client: client})

	log.Printf("Server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
