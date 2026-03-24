#!/bin/bash

# Configuration - Change the port if your backend uses a different one
API_URL="http://localhost:3000/auth/register"

# Array of usernames to register
USERS=("dev" "johndoe" "janedoe" "admin" "tester")

echo "Starting user registration..."

for USER in "${USERS[@]}"
do
    echo "Registering: $USER"
    
    # Sending the POST request
    curl -X POST "$API_URL" \
         -H "Content-Type: application/json" \
         -d "{
               \"username\": \"$USER\",
               \"password\": \"password123\",
               \"encryptionSalt\": \"dGVzdF9zYWx0XzEyMzQ1Ng==\"
             }"
             
    printf "\n------------------------\n"
done

echo "Registration sequence complete."