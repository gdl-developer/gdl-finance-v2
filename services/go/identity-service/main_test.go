package main

import (
	"context"
	"net"
	"testing"

	pb "github.com/gdl/identity-service/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
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

	// Test RefreshToken (which uses ValidateToken internally)
	resp, err := client.RefreshToken(ctx, &pb.RefreshTokenRequest{RefreshToken: "invalid-token"})
	if err != nil {
		t.Errorf("RefreshToken failed: %v", err)
	}

	if resp.Success != false {
		t.Errorf("Expected RefreshToken to fail with invalid token, got success")
	}
}
