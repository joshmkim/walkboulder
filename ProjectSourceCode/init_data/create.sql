-- Drop all tables first to avoid conflicts
DROP TABLE IF EXISTS user_to_history CASCADE;
DROP TABLE IF EXISTS user_to_achievements CASCADE;
DROP TABLE IF EXISTS user_to_friend CASCADE;
DROP TABLE IF EXISTS trails_to_user CASCADE;
DROP TABLE IF EXISTS reviews_to_images CASCADE;
DROP TABLE IF EXISTS trails_to_reviews CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS history CASCADE;
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
    image_url VARCHAR(300),
    trail_id SERIAL PRIMARY KEY
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    password VARCHAR(100) NOT NULL,
    total_distance DECIMAL NOT NULL DEFAULT 0,
    about TEXT NOT NULL DEFAULT '',
    avatar BYTEA
);

CREATE TABLE achievements (
    achievements_id SERIAL PRIMARY KEY,
    achievements_url VARCHAR(300) NOT NULL,
    achievements_caption VARCHAR(200)
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

CREATE TABLE history
(
    history_id SERIAL PRIMARY KEY,
    start_location VARCHAR(100) NOT NULL,
    end_location VARCHAR(100) NOT NULL,
    buddy VARCHAR(100) NOT NULL,
    date DATE
);

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

-- =============================================
-- SAMPLE DATA INSERTION
-- =============================================

-- Insert sample trails (6 popular Boulder trails)
INSERT INTO trails (name, location, distance, difficulty, discription, average_rating, image_url) VALUES
('Chautauqua Trail', 'Boulder', 1.2, 'easy', 'Iconic trail with stunning Flatiron views. Great for beginners.', 4.7, 'https://images.unsplash.com/photo-1551632811-561732d1e306'),
('Royal Arch Trail', 'Boulder', 3.5, 'difficult', 'Challenging hike with rewarding arch formation at the top.', 4.8, 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4'),
('Mount Sanitas Trail', 'Boulder', 3.3, 'moderate', 'Popular loop with great city views and rocky terrain.', 4.5, 'https://images.unsplash.com/photo-1470114716159-e389f8712fda'),
('Bear Peak', 'Boulder', 5.1, 'very_difficult', 'One of Boulder''s most challenging hikes with panoramic views.', 4.9, 'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81'),
('Boulder Creek Path', 'Boulder', 5.5, 'easy', 'Paved multi-use path following Boulder Creek through town.', 4.2, 'https://images.unsplash.com/photo-1476231682828-37e571bc172f'),
('Mesa Trail', 'Boulder', 6.7, 'moderate', 'Scenic 7-mile trail connecting multiple trailheads.', 4.6, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b');

-- Insert sample users
INSERT INTO users (username, password, total_distance, about) VALUES
('hiker_jane', 'securepass123', 28.4, 'Weekend warrior exploring all Boulder trails'),
('mountain_mike', 'climbhigh22', 56.7, 'Ultra-runner and trail enthusiast'),
('nature_nate', 'leafytrails', 12.3, 'Casual hiker who loves photography');

-- Insert sample reviews
INSERT INTO reviews (username, review, rating) VALUES
('hiker_jane', 'Absolutely loved the view from Royal Arch!', 5),
('mountain_mike', 'Bear Peak kicked my butt but worth it', 4),
('nature_nate', 'Perfect easy walk along the creek', 5);

-- Associate reviews with trails
INSERT INTO trails_to_reviews (trail_id, review_id) VALUES
(2, 1),  -- Royal Arch review
(4, 2),  -- Bear Peak review
(5, 3);  -- Boulder Creek review

-- Insert sample images for reviews
INSERT INTO images (image_url, image_caption) VALUES
('https://example.com/royalarch1.jpg', 'View from Royal Arch'),
('https://example.com/bearpeak1.jpg', 'Summit of Bear Peak'),
('https://example.com/creekpath1.jpg', 'Boulder Creek in fall');

-- Associate images with reviews
INSERT INTO reviews_to_images (image_id, review_id) VALUES
(1, 1),
(2, 2),
(3, 3);

-- Sample hiking history
INSERT INTO history (start_location, end_location, buddy, date) VALUES
('Chautauqua Trailhead', 'Royal Arch', 'mountain_mike', '2023-05-15'),
('NCAR', 'Bear Peak', 'hiker_jane', '2023-06-20');

-- Sample user relationships
INSERT INTO user_to_friend (username, friend_id) VALUES
(1, 2),  -- hiker_jane friends with mountain_mike
(1, 3);  -- hiker_jane friends with nature_nate


-- Add two more sample trails (append to your existing INSERT statement)
INSERT INTO trails (name, location, distance, difficulty, discription, average_rating, image_url) VALUES
('Flagstaff Mountain Trail', 'Boulder', 4.2, 'moderate', 'Beautiful summit views of Boulder with varied terrain', 4.4, 'https://images.unsplash.com/photo-1517649763962-0c623066013b'),
('South Boulder Peak Trail', 'Boulder', 6.6, 'difficult', 'Highest peak in Boulder with incredible 360° views', 4.7, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b');

-- Add sample reviews for these new trails
INSERT INTO reviews (username, review, rating) VALUES
('mountain_mike', 'Flagstaff has the best sunset views!', 5),
('nature_nate', 'South Boulder Peak was tough but unforgettable', 4);

-- Associate the new reviews with trails
INSERT INTO trails_to_reviews (trail_id, review_id) VALUES
(7, 4),  -- Flagstaff Mountain review
(8, 5);  -- South Boulder Peak review

-- Add sample images for the new reviews
INSERT INTO images (image_url, image_caption) VALUES
('https://example.com/flagstaff1.jpg', 'Flagstaff Mountain sunset'),
('https://example.com/southboulder1.jpg', 'View from South Boulder Peak');

-- Associate the new images with reviews
INSERT INTO reviews_to_images (image_id, review_id) VALUES
(4, 4),
(5, 5);