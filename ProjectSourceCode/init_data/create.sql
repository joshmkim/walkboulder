DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users
(
    username VARCHAR(50) PRIMARY KEY,
    password VARCHAR(60) NOT NULL,
    total_distance SERIAL NOT NULL,
    about VARCHAR(200) NOT NULL
);