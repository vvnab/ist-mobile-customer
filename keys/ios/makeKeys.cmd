openssl x509 -in %1.cer -inform DER -out %1.pem -outform PEM
openssl pkcs12 -nocerts -in mykey.p12 -out mykey.pem
openssl pkcs12 -export -inkey mykey.key -in %1.pem -out %1.p12