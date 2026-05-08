module github.com/gdl/transaction-service

go 1.26.2

replace github.com/gdl/identity-service => ../identity-service

replace github.com/gdl/account-service => ../account-service

require (
	github.com/gdl/account-service v0.0.0-00010101000000-000000000000
	github.com/gdl/bankone-connector v0.0.0-00010101000000-000000000000
	github.com/gdl/identity-service v0.0.0-00010101000000-000000000000
	github.com/joho/godotenv v1.5.1
	google.golang.org/grpc v1.80.0
	google.golang.org/protobuf v1.36.11
)

require (
	golang.org/x/net v0.52.0 // indirect
	golang.org/x/sys v0.43.0 // indirect
	golang.org/x/text v0.36.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20260120221211-b8f7ae30c516 // indirect
)

replace github.com/gdl/transaction-service/proto => ./proto

replace github.com/gdl/identity-service/proto => ../identity-service/proto

replace github.com/gdl/account-service/proto => ../account-service/proto

replace github.com/gdl/bankone-connector/proto => ../bankone-connector/proto

replace github.com/gdl/bankone-connector => ../bankone-connector
