
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

CREATE TABLE trails 
(
    -- average_rating DECIMAL,
    -- difficulty VARCHAR(100) CONSTRAINT limited_values CHECK (difficulty in ('easy', 'moderate', 'difficult', 'very_difficult')),
    -- discription VARCHAR(200) NOT NULL,
    -- distance DECIMAL,
    -- location VARCHAR(100) NOT NULL,
    trail_name VARCHAR(100) NOT NULL,
    trail_id SERIAL PRIMARY KEY
);
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

CREATE TABLE reviews (
  review_id SERIAL PRIMARY KEY,
  trail_id INTEGER REFERENCES trails(trail_id),
  user_id INTEGER REFERENCES users(user_id),

--   trail_name VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL,
  written_review TEXT NOT NULL
--   user_id INT REFERENCES users(user_id)
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
-- CREATE TABLE IF NOT EXISTS reviews (review_id SERIAL PRIMARY KEY);
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

CREATE TABLE users_to_reviews (
    user_id INT NOT NULL,
    review_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES reviews (review_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, review_id)
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