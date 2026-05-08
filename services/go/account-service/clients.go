package main

import (
	"log"
	"os"

	bankone_pb "github.com/gdl/bankone-connector/proto"
	symplus_pb "github.com/gdl/symplus-service/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type Clients struct {
	BankOne bankone_pb.BankOneServiceClient
	Symplus symplus_pb.SymplusServiceClient
}

func InitClients() *Clients {
	bankoneAddr := os.Getenv("BANKONE_SERVICE_ADDR")
	if bankoneAddr == "" {
		bankoneAddr = "localhost:50056"
	}

	symplusAddr := os.Getenv("SYMPLUS_SERVICE_ADDR")
	if symplusAddr == "" {
		symplusAddr = "localhost:50055"
	}

	conn1, err := grpc.Dial(bankoneAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Printf("could not connect to bankone: %v", err)
	}

	conn2, err := grpc.Dial(symplusAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Printf("could not connect to symplus: %v", err)
	}

	return &Clients{
		BankOne: bankone_pb.NewBankOneServiceClient(conn1),
		Symplus: symplus_pb.NewSymplusServiceClient(conn2),
	}
}
