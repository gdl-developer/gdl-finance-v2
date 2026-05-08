package main

import (
	"context"
	"net"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
	pb "gdl-v2-identity/proto"
)

const bufSize = 1024 * 1024

var lis *bufconn.Listener

func init() {
	lis = bufconn.Listen(bufSize)
	s := grpc.NewServer()
	// Mock implementation or use actual server struct
	server := &server{}
	pb.RegisterIdentityServiceServer(s, server)
	go func() {
		if err := s.Serve(lis); err != nil {
			panic(err)
		}
	}()
}

func bufDialer(context.Context, string) (net.Conn, error) {
	return lis.Dial()
}

func TestHealthCheck(t *testing.T) {
	ctx := context.Background()
	conn, err := grpc.DialContext(ctx, "bufnet", grpc.WithContextDialer(bufDialer), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatalf("Failed to dial bufnet: %v", err)
	}
	defer conn.Close()
	client := pb.NewIdentityServiceClient(conn)
	
	// Assuming there is a HealthCheck method in the proto
	// If not, we can test a simple Login or Register with empty params
	resp, err := client.ValidateToken(ctx, &pb.TokenRequest{Token: "invalid-token"})
	if err != nil {
		t.Errorf("ValidateToken failed: %v", err)
	}
	
	if resp.Valid != false {
		t.Errorf("Expected token to be invalid, got valid")
	}
}
