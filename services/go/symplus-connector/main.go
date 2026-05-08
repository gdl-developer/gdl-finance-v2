package main

import (
	"context"
	"log"
	"net"
	"os"

	pb "github.com/gdl/symplus-connector/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

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

	s := grpc.NewServer()
	pb.RegisterSymplusServiceServer(s, &server{client: client})

	log.Printf("Symplus Connector (Go) listening on :%s", port)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
