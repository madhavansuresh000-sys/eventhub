#!/bin/sh
# Runs once, when the MySQL volume is first created: adds a separate database for automated tests.
mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS eventhub_test;
GRANT ALL PRIVILEGES ON eventhub_test.* TO '$MYSQL_USER'@'%';
SQL
