#!/bin/bash  

wget -q https://github.com/andes/andes-test-integracion/raw/master/docker/andes.gz
docker cp andes.gz andes_dev_mongo_1:/andes.gz
docker exec andes_dev_mongo_1 mongorestore --gzip --archive=/andes.gz
docker exec andes_dev_mongo_1 rm andes.gz
rm andes.gz