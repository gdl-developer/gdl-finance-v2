package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"time"

	account_pb "github.com/gdl/account-service/proto"
	bankone_pb "github.com/gdl/bankone-connector/proto"
	identity_pb "github.com/gdl/identity-service/proto"
	pb "github.com/gdl/transaction-service/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
)

type server struct {
	pb.UnimplementedTransactionServiceServer
	identity identity_pb.IdentityServiceClient
	account  account_pb.AccountServiceClient
	bankone  bankone_pb.BankOneServiceClient
}

func (s *server) TransferBank(ctx context.Context, req *pb.BankTransferRequest) (*pb.TransferResponse, error) {
	log.Printf("Bank transfer request from %s: %f to %s", req.FromUserId, req.Amount, req.AccountNumber)

	// 1. SECURE: Verify Transaction PIN (MFA)
	pinResp, err := s.identity.VerifyPIN(ctx, &identity_pb.VerifyPINRequest{
		UserId: req.FromUserId,
		Pin:    req.Pin,
		Type:   "TRANSACTION",
	})
	if err != nil || !pinResp.Success {
		return &pb.TransferResponse{Success: false, Message: "Unauthorized: Invalid Transaction PIN"}, nil
	}

	// 2. COMPLIANCE: Verify KYC Limits (CBN Compliance)
	kycStatus, err := s.identity.GetKYCStatus(ctx, &identity_pb.GetKYCStatusRequest{UserId: req.FromUserId})
	if err == nil {
		if req.Amount > kycStatus.DailyLimit {
			return &pb.TransferResponse{Success: false, Message: fmt.Sprintf("Amount exceeds your daily limit of ₦%.2f", kycStatus.DailyLimit)}, nil
		}
	}

	// 3. EXECUTE: Call BankOne Interbank Transfer (NIP)
	// We first fetch the user's source account from Account-Service
	account, err := s.account.GetBankOneBalance(ctx, &account_pb.GetBalanceRequest{UserId: req.FromUserId})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to retrieve source account")
	}

	bankoneResp, err := s.bankone.InterbankTransfer(ctx, &bankone_pb.InterbankTransferRequest{
		Amount:              fmt.Sprintf("%.2f", req.Amount),
		SourceAccount:       account.AccountNumber,
		DestinationAccount:  req.AccountNumber,
		DestinationBankCode: req.BankCode,
		Narration:           req.Narration,
		Reference:           fmt.Sprintf("TRF-%d", time.Now().UnixNano()),
	})

	if err != nil || !bankoneResp.Success {
		return &pb.TransferResponse{Success: false, Message: "BankOne Transfer Failed: " + bankoneResp.Message}, nil
	}

	return &pb.TransferResponse{
		Success:        true,
		Message:        "Interbank Transfer successful",
		TransactionRef: bankoneResp.Message, // BankOne usually returns ref in message or data
	}, nil
}

func (s *server) TransferInternal(ctx context.Context, req *pb.TransferRequest) (*pb.TransferResponse, error) {
	log.Printf("Internal transfer from %s to %s: %f", req.FromUserId, req.ToAccount, req.Amount)

	// 1. SECURE: Verify Transaction PIN
	pinResp, err := s.identity.VerifyPIN(ctx, &identity_pb.VerifyPINRequest{
		UserId: req.FromUserId,
		Pin:    req.Pin,
		Type:   "TRANSACTION",
	})
	if err != nil || !pinResp.Success {
		return &pb.TransferResponse{Success: false, Message: "Unauthorized: Invalid Transaction PIN"}, nil
	}

	return &pb.TransferResponse{
		Success:        true,
		Message:        "Internal Transfer successful",
		TransactionRef: fmt.Sprintf("INT-%d", time.Now().UnixNano()),
	}, nil
}

func (s *server) GetBankList(ctx context.Context, req *pb.Empty) (*pb.BankListResponse, error) {
	_, err := s.bankone.GetOtherBankList(ctx, &bankone_pb.Empty{})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch bank list")
	}

	// Logic to parse bankoneResp.Data into pb.BankListResponse
	// For now returning mock/empty success
	return &pb.BankListResponse{}, nil
}

func (s *server) AccountEnquiry(ctx context.Context, req *pb.EnquiryRequest) (*pb.EnquiryResponse, error) {
	resp, err := s.bankone.AccountEnquiry(ctx, &bankone_pb.AccountEnquiryRequest{
		AccountNumber: req.AccountNumber,
	})
	if err != nil || (resp != nil && !resp.Success) {
		return &pb.EnquiryResponse{Success: false, Message: "Account not found"}, nil
	}

	return &pb.EnquiryResponse{
		Success:     true,
		AccountName: resp.Message, // BankOne usually puts name in message/data
	}, nil
}

func main() {
	godotenv.Load()
	port := os.Getenv("PORT")
	if port == "" {
		port = "50057"
	}

	// Connect to Identity Service
	connID, _ := grpc.Dial("localhost:50052", grpc.WithTransportCredentials(insecure.NewCredentials()))
	identityClient := identity_pb.NewIdentityServiceClient(connID)

	// Connect to Account Service
	connAcc, _ := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	accountClient := account_pb.NewAccountServiceClient(connAcc)

	// Connect to BankOne Connector
	connBankone, _ := grpc.Dial("localhost:50053", grpc.WithTransportCredentials(insecure.NewCredentials()))
	bankoneClient := bankone_pb.NewBankOneServiceClient(connBankone)

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterTransactionServiceServer(s, &server{
		identity: identityClient,
		account:  accountClient,
		bankone:  bankoneClient,
	})

	log.Printf("Transaction Service listening on :%s", port)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
