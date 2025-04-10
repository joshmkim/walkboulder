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
DROP TABLE IF EXISTS trails CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS images CASCADE;

-- Create tables (order matters for foreign keys)
CREATE TABLE trails 
(
    average_rating DECIMAL,
    difficulty VARCHAR(100) CONSTRAINT limited_values CHECK (difficulty in ('easy', 'moderate', 'difficult', 'very_difficult')),
    discription VARCHAR(200) NOT NULL,
    distance DECIMAL,
    location VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    trail_id SERIAL PRIMARY KEY
);


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

CREATE TABLE IF NOT EXISTS reviews 
(
  review_id SERIAL PRIMARY KEY NOT NULL,
  username VARCHAR(100),
  review VARCHAR(200),
  rating DECIMAL NOT NULL
);

CREATE TABLE IF NOT EXISTS images 
(
  image_id SERIAL PRIMARY KEY NOT NULL,
  image_url VARCHAR(300) NOT NULL,
  image_caption VARCHAR(200)
);

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users
(
    user_id SERIAL PRIMARY KEY NOT NULL,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(60) NOT NULL,
    total_distance SERIAL NOT NULL,
    about VARCHAR(200) NOT NULL,
    avatar BYTEA
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
    start_location VARCHAR(100) NOT NULL,
    end_location VARCHAR(100) NOT NULL,
    buddy VARCHAR(100) NOT NULL,
    date DATE
);

DROP TABLE IF EXISTS trails_to_reviews CASCADE;
CREATE TABLE trails_to_reviews 
(
  trail_id INT NOT NULL,
  review_id INT NOT NULL,
  FOREIGN KEY (trail_id) REFERENCES trails (trail_id) ON DELETE CASCADE,
  FOREIGN KEY (review_id) REFERENCES reviews (review_id) ON DELETE CASCADE
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

-- Creating a Trigger Function in order to add friends as a two-way relationship
CREATE OR REPLACE FUNCTION make_friendship_mutual()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_to_friend
        WHERE username = NEW.friend_id AND friend_id = NEW.username
    ) THEN
        INSERT INTO user_to_friend (username, friend_id)
        VALUES (NEW.friend_id, NEW.username);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

    -- The trigger itself
CREATE TRIGGER mutual_friendship
AFTER INSERT ON user_to_friend
FOR EACH ROW
EXECUTE FUNCTION make_friendship_mutual();
);
