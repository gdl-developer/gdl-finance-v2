module github.com/gdl/transaction-service

go 1.26.2

replace github.com/gdl/identity-service => ../identity-service

replace github.com/gdl/account-service => ../account-service

require (
	github.com/gdl/account-service v0.0.0-00010101000000-000000000000
	github.com/gdl/bankone-connector v0.0.0
	github.com/gdl/identity-service v0.0.0-00010101000000-000000000000
	github.com/joho/godotenv v1.5.1
	google.golang.org/grpc v1.81.0
	google.golang.org/protobuf v1.36.11
	gorm.io/driver/sqlite v1.6.0
	gorm.io/gorm v1.30.0
)

require (
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	github.com/mattn/go-sqlite3 v1.14.22 // indirect
	golang.org/x/net v0.52.0 // indirect
	golang.org/x/sys v0.43.0 // indirect
	golang.org/x/text v0.36.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20260226221140-a57be14db171 // indirect
)

replace github.com/gdl/transaction-service/proto => ./proto

replace github.com/gdl/identity-service/proto => ../identity-service/proto

replace github.com/gdl/account-service/proto => ../account-service/proto

replace github.com/gdl/bankone-connector/proto => ../bankone-connector/proto

replace github.com/gdl/bankone-connector => ../bankone-connector
