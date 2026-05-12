module github.com/gdl/account-service

go 1.21

require (
	github.com/alicebob/miniredis/v2 v2.38.0
	github.com/gdl/bankone-connector v0.0.0
	github.com/gdl/symplus-service v0.0.0
	github.com/go-redis/redis/v8 v8.11.5
	github.com/joho/godotenv v1.5.1
	github.com/redis/go-redis/v9 v9.19.0
	github.com/segmentio/kafka-go v0.4.51
	github.com/stretchr/testify v1.8.0
	google.golang.org/grpc v1.81.0
	google.golang.org/protobuf v1.36.11
	gorm.io/driver/mysql v1.6.0
	gorm.io/gorm v1.30.0
)

require (
	filippo.io/edwards25519 v1.1.0 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/go-sql-driver/mysql v1.8.1 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	github.com/klauspost/compress v1.15.9 // indirect
	github.com/pierrec/lz4/v4 v4.1.15 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	github.com/yuin/gopher-lua v1.1.1 // indirect
	go.uber.org/atomic v1.11.0 // indirect
	golang.org/x/net v0.51.0 // indirect
	golang.org/x/sys v0.42.0 // indirect
	golang.org/x/text v0.34.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20260226221140-a57be14db171 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

replace github.com/gdl/account-service/proto => ./proto

replace github.com/gdl/bankone-connector => ../bankone-connector

replace github.com/gdl/symplus-service => ../symplus-service
