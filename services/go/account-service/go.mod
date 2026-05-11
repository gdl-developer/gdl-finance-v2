module github.com/gdl/account-service

go 1.26.2

require (
	github.com/gdl/bankone-connector v0.0.0-00010101000000-000000000000
	github.com/gdl/symplus-service v0.0.0-00010101000000-000000000000
	github.com/joho/godotenv v1.5.1
	github.com/redis/go-redis/v9 v9.19.0
	github.com/segmentio/kafka-go v0.4.51
	google.golang.org/grpc v1.80.0
	google.golang.org/protobuf v1.36.11
	gorm.io/driver/postgres v1.6.0
	gorm.io/gorm v1.31.1
)

require (
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 // indirect
	github.com/jackc/pgx/v5 v5.6.0 // indirect
	github.com/jackc/puddle/v2 v2.2.2 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	github.com/klauspost/compress v1.15.9 // indirect
	github.com/pierrec/lz4/v4 v4.1.15 // indirect
	go.uber.org/atomic v1.11.0 // indirect
	golang.org/x/crypto v0.47.0 // indirect
	golang.org/x/net v0.49.0 // indirect
	golang.org/x/sync v0.19.0 // indirect
	golang.org/x/sys v0.40.0 // indirect
	golang.org/x/text v0.33.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20260120221211-b8f7ae30c516 // indirect
)

replace github.com/gdl/bankone-connector => ../bankone-connector

replace github.com/gdl/symplus-service => ../symplus-service

replace github.com/gdl/account-service/proto => ./proto
