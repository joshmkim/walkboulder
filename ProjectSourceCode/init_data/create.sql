/*
DROP TABLE IF EXISTS users;
CREATE TABLE users
(
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    password varchar(30) NOT NULL
);

DROP TABLE IF EXISTS achievements;
CREATE TABLE achievements
(
    achievements_id SERIAL NOT NULL,
    achievements_url VARCHAR(300) NOT NULL,
    achievements_caption VARCHAR(200)
);

DROP TABLE IF EXISTS history CASCADE;
CREATE TABLE history
(
    history_id SERIAL NOT NULL,
    location VARCHAR(100) NOT_NULL,
    start_location VARCHAR(100) NOT_NULL,
    end_location VARCHAR(100) NOT_NULL,
    buddy VARCHAR(100) NOT_NULL,
    date VARCHAR(100) NOT_NULL
);

DROP TABLE IF EXISTS trails_to_reviews CASCADE;
CREATE TABLE trails_to_reviews 
(
  trail_id INT NOT NULL,
  review_id INT NOT NULL,
  FOREIGN KEY (trail_id) REFERENCES trails (trail_id) ON DELETE CASCADE,
  FOREIGN KEY (review_id) REFERENCES reviews (review_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS reviews_to_images CASCADE;
CREATE TABLE reviews_to_images 
(
  image_id INT NOT NULL,
  review_id INT NOT NULL,
  FOREIGN KEY (image_id) REFERENCES images (image_id) ON DELETE CASCADE,
  FOREIGN KEY (review_id) REFERENCES reviews (review_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS trails_to_user CASCADE;
CREATE TABLE trails_to_user
(
    trail_id INT NOT NULL,
    username INT NOT NULL
);

DROP TABLE IF EXISTS user_to_friend CASCADE;
CREATE TABLE user_to_friend
(
    username INT NOT NULL,
    friend_id INT NOT NULL
);

DROP TABLE IF EXISTS trails_to_user CASCADE;
CREATE TABLE user_to_achievements
(
    username INT NOT NULL,
    achievements_id INT NOT NULL
);

DROP TABLE IF EXISTS user_to_history CASCADE;
CREATE TABLE user_to_history
(
    username INT NOT NULL,
    history_id INT NOT NULL
);
*/


-- Drop all tables first to avoid conflicts
DROP TABLE IF EXISTS user_to_history CASCADE;
DROP TABLE IF EXISTS user_to_achievements CASCADE;
DROP TABLE IF EXISTS user_to_friend CASCADE;
DROP TABLE IF EXISTS trails_to_user CASCADE;
DROP TABLE IF EXISTS reviews_to_images CASCADE;
DROP TABLE IF EXISTS trails_to_reviews CASCADE;
DROP TABLE IF EXISTS history CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create tables (order matters for foreign keys)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    password VARCHAR(100) NOT NULL
);

CREATE TABLE achievements (
    achievements_id SERIAL PRIMARY KEY,
    achievements_url VARCHAR(300) NOT NULL,
    achievements_caption VARCHAR(200)
);

CREATE TABLE history (
    history_id SERIAL PRIMARY KEY,
    location VARCHAR(100) NOT NULL,
    start_location VARCHAR(100) NOT NULL,
    end_location VARCHAR(100) NOT NULL,
    buddy VARCHAR(100) NOT NULL,
    date DATE NOT NULL  -- Changed to DATE type
);

-- Assuming these tables exist (add their CREATE statements if not)
CREATE TABLE IF NOT EXISTS trails (trail_id SERIAL PRIMARY KEY);
CREATE TABLE IF NOT EXISTS reviews (review_id SERIAL PRIMARY KEY);
CREATE TABLE IF NOT EXISTS images (image_id SERIAL PRIMARY KEY);

-- Junction tables
CREATE TABLE trails_to_reviews (
    trail_id INT NOT NULL,
    review_id INT NOT NULL,
    FOREIGN KEY (trail_id) REFERENCES trails (trail_id) ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES reviews (review_id) ON DELETE CASCADE,
    PRIMARY KEY (trail_id, review_id)
);

CREATE TABLE reviews_to_images (
    image_id INT NOT NULL,
    review_id INT NOT NULL,
    FOREIGN KEY (image_id) REFERENCES images (image_id) ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES reviews (review_id) ON DELETE CASCADE,
    PRIMARY KEY (image_id, review_id)
);

CREATE TABLE trails_to_user (
    trail_id INT NOT NULL,
    username INT NOT NULL,
    FOREIGN KEY (trail_id) REFERENCES trails (trail_id) ON DELETE CASCADE,
    FOREIGN KEY (username) REFERENCES users (user_id) ON DELETE CASCADE,
    PRIMARY KEY (trail_id, username)
);

CREATE TABLE user_to_friend (
    username INT NOT NULL,
    friend_id INT NOT NULL,
    FOREIGN KEY (username) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users (user_id) ON DELETE CASCADE,
    PRIMARY KEY (username, friend_id)
);

CREATE TABLE user_to_achievements (
    username INT NOT NULL,
    achievements_id INT NOT NULL,
    FOREIGN KEY (username) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (achievements_id) REFERENCES achievements (achievements_id) ON DELETE CASCADE,
    PRIMARY KEY (username, achievements_id)
);

CREATE TABLE user_to_history (
    username INT NOT NULL,
    history_id INT NOT NULL,
    FOREIGN KEY (username) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (history_id) REFERENCES history (history_id) ON DELETE CASCADE,
    PRIMARY KEY (username, history_id)
);