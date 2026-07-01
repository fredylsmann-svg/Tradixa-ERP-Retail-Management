# Use the official Golang image to build the app
FROM golang:1.21-alpine as builder

# Create and change to the app directory
WORKDIR /app

# Retrieve application dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy local code to the container image
COPY . ./

# Build the binary
RUN go build -v -o server

# Use a lean image for execution
FROM alpine:3.19
RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy the binary to the production image from the builder stage
COPY --from=builder /app/server /app/server

# Run the web service on container startup
CMD ["/app/server"]
