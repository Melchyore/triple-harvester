#!/bin/bash
# accept sparql endpoint from environment
sed -i 's!SPARQL!'"$SPARQL"'!' /var/www/ldf-server/config/config.json
#usage: server config.json [port [workers [componentConfigUri]]]

node /var/www/ldf-server/bin/ldf-server /var/www/ldf-server/config/config.json 3000 1

