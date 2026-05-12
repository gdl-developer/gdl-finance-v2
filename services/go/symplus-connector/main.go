package main

import (
	"context"
	"log"
	"net"
	"os"

	pb "github.com/gdl/symplus-connector/proto"
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

type server struct {
	pb.UnimplementedSymplusServiceServer
	client *SymplusClient
}

func (s *server) GetFunds(ctx context.Context, req *pb.Empty) (*pb.SymplusResponse, error) {
	return s.client.get("/GetFunds/")
}

func (s *server) GetFundAccounts(ctx context.Context, req *pb.GetAccountsRequest) (*pb.SymplusResponse, error) {
	return s.client.get("/GetFundAccounts/" + req.CustomerId)
}

func (s *server) FundSubscription(ctx context.Context, req *pb.FundSubscriptionRequest) (*pb.SymplusResponse, error) {
	body := map[string]interface{}{
		"subscription": []map[string]interface{}{
			{
				"customer":  req.CustomerId,
				"fund":      req.FundId,
				"amount":    req.Amount,
				"reference": req.PaymentReference,
				"narration": req.Narration,
			},
		},
	}
	return s.client.post("/DoFundSubscription/", body)
}

func (s *server) FundRedemption(ctx context.Context, req *pb.FundRedemptionRequest) (*pb.SymplusResponse, error) {
	body := map[string]interface{}{
		"redemption": []map[string]interface{}{
			{
				"customer":  req.CustomerId,
				"fund":      req.FundId,
				"amount":    req.Amount,
				"narration": req.Narration,
			},
		},
	}
	return s.client.post("/DoFundRedemption/", body)
}

func (s *server) GetFundPrice(ctx context.Context, req *pb.FundPriceRequest) (*pb.SymplusResponse, error) {
	return s.client.get("/GetFundPrice/" + req.FundId + "/")
}

func main() {
	godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "50058"
	}

	baseURL := os.Getenv("SYMPLUS_BASEURL")
	clientKey := os.Getenv("SYMPLUS_CLIENT_KEY")
	privateKey := os.Getenv("SYMPLUS_PRIVATE_KEY")

	client := NewSymplusClient(baseURL, clientKey, privateKey)

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor),
	)
	pb.RegisterSymplusServiceServer(s, &server{client: client})
	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(s, healthServer)
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	reflection.Register(s)

	log.Printf("Symplus Connector (Go) listening on :%s", port)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
