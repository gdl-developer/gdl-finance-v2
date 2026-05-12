package main

import (
	"context"
	"log"
	"net"
	"os"

	pb "github.com/gdl/symplus-service/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
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

	s := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor),
	)
	pb.RegisterSymplusServiceServer(s, &server{client: client})
	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(s, healthServer)
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	reflection.Register(s)

	log.Printf("Server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
