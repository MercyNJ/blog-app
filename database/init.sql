CREATE DATABASE IF NOT EXISTS inlightofeternity;

CREATE USER IF NOT EXISTS 'inlightofeternity_user'@'localhost'
IDENTIFIED BY 'passwordexample';

GRANT ALL PRIVILEGES
ON inlightofeternity.*
TO 'inlightofeternity_user'@'localhost';

FLUSH PRIVILEGES;