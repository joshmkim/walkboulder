-- Drop all tables first to avoid conflicts
DROP TABLE IF EXISTS user_saved_trails CASCADE;
DROP TABLE IF EXISTS user_to_history CASCADE;
DROP TABLE IF EXISTS user_to_achievements CASCADE;
DROP TABLE IF EXISTS user_to_friend CASCADE;
DROP TABLE IF EXISTS trails_to_user CASCADE;
DROP TABLE IF EXISTS trails_to_reviews CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS history CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS trails CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;

-- Create tables (order matters for foreign keys)
CREATE TABLE trails 
(
    average_rating DECIMAL,
    distance DECIMAL,
    start_location VARCHAR(100) NOT NULL,
    end_location VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    difficulty DECIMAL,
    description VARCHAR(1000),
    image_url VARCHAR(300),
    trail_id SERIAL PRIMARY KEY
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    firstname VARCHAR(30),
    lastname VARCHAR(30),
    email VARCHAR(30),
    username VARCHAR(30) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    total_distance DECIMAL NOT NULL DEFAULT 0,
    about TEXT NOT NULL DEFAULT '',
    avatar BYTEA,
    friend_code VARCHAR(10) UNIQUE
);

CREATE TABLE user_saved_trails (
    user_id INT NOT NULL,
    trail_id INT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (trail_id) REFERENCES trails (trail_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, trail_id)
);

CREATE TABLE achievements (
    achievements_id SERIAL PRIMARY KEY,
    achievements_url VARCHAR(300) NOT NULL,
    achievements_caption VARCHAR(200)
);

-- Update the reviews table to better match your needs
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    trail_id INT REFERENCES trails(trail_id) ON DELETE CASCADE,
    rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    written_review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, trail_id) -- Prevent duplicate reviews per user per trail
);

CREATE TABLE images (
    image_id SERIAL PRIMARY KEY,
    image_url VARCHAR(300) NOT NULL,
    image_caption VARCHAR(200)
);

CREATE TABLE history (
    history_id SERIAL PRIMARY KEY,
    start_location VARCHAR(100) NOT NULL,
    end_location VARCHAR(100) NOT NULL,
    buddy VARCHAR(100) NOT NULL,
    date DATE
);

CREATE TABLE trails_to_reviews (
    trail_id INT NOT NULL,
    review_id INT NOT NULL,
    FOREIGN KEY (trail_id) REFERENCES trails (trail_id) ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES reviews (review_id) ON DELETE CASCADE,
    PRIMARY KEY (trail_id, review_id)
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
    PRIMARY KEY (username, friend_id),
    CHECK (username != friend_id)
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

CREATE TABLE reviews_to_images (
    review_id INT NOT NULL,
    image_id INT NOT NULL,
    FOREIGN KEY (review_id) REFERENCES reviews (review_id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES images (image_id) ON DELETE CASCADE,
    PRIMARY KEY (review_id, image_id)
);

CREATE TABLE friend_requests (
    request_id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CHECK (sender_id != receiver_id),
    UNIQUE (sender_id, receiver_id) -- Prevent duplicate requests
);

-- Create index for faster friend lookups
CREATE INDEX idx_user_friends ON user_to_friend(username, friend_id);

-- Function to handle mutual friendship creation
CREATE OR REPLACE FUNCTION create_mutual_friendship()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create reciprocal friendship if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM user_to_friend 
        WHERE username = NEW.friend_id AND friend_id = NEW.username
    ) THEN
        INSERT INTO user_to_friend (username, friend_id)
        VALUES (NEW.friend_id, NEW.username)
        ON CONFLICT (username, friend_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for mutual friendships
CREATE TRIGGER mutual_friendship_trigger
AFTER INSERT ON user_to_friend
FOR EACH ROW
EXECUTE FUNCTION create_mutual_friendship();

-- =============================================
-- SAMPLE DATA INSERTION
-- =============================================

-- Insert sample trails
INSERT INTO trails (average_rating, distance, start_location, end_location, name, difficulty, description, image_url) VALUES
(4.7, 0.4, 'Royal Arch Trail Head', 'Chautauqua Trail Overlook', 'Chautauqua Trail', 1, 'Iconic trail with stunning Flatiron views. Great for beginners.', 'https://images.unsplash.com/photo-1551632811-561732d1e306'),
(4.8, 3.6, 'Royal Arch Trail Head', 'Royal Arch', 'Royal Arch Trail', 3, 'Challenging hike with rewarding arch formation at the top.', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4'),
(4.5, 2.4, 'Mount Sanitas Trailhead', 'Mount Sanitas', 'Mount Sanitas Trail', 3, 'Popular loop with great city views and rocky terrain.', 'https://images.unsplash.com/photo-1470114716159-e389f8712fda'),
(4.9, 3.8, 'Bear Canyon', 'Bear Peak', 'Bear Peak Trail',  4.5, 'One of Boulder''s most challenging hikes with panoramic views.', 'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81'),
(4.2, 4.1, 'Boulder Creek Park', 'Boulder Canyon Trail', 'Boulder Creek Path', 2.5, 'Paved multi-use path following Boulder Creek through town.', 'https://images.unsplash.com/photo-1476231682828-37e571bc172f'),
(4.6, 5.2, 'South Mesa Trailhead', 'Mesa Trail', 'Mesa Trail', 3.5, 'Scenic 7-mile trail connecting multiple trailheads.', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b'),
(4.4, 3.6, 'Trail to Flagstaff Trailhead', 'Sunrise Amphitheater', 'Flagstaff Mountain Trail', 3, 'Beautiful summit views of Boulder with varied terrain', 'https://images.unsplash.com/photo-1517649763962-0c623066013b'),
(4.7, 7.6, 'South Mesa Trailhead', 'South Boulder Peak', 'South Boulder Peak Trail', 4.8, 'Highest peak in Boulder with incredible 360° views', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b');

-- Insert sample users with friend codes
INSERT INTO users (username, password, total_distance, about, friend_code) VALUES
('hiker_jane', 'securepass123', 28.4, 'Weekend warrior exploring all Boulder trails', 'JANE1234'),
('mountain_mike', 'climbhigh22', 56.7, 'Ultra-runner and trail enthusiast', 'MIKE5678'),
('nature_nate', 'leafytrails', 12.3, 'Casual hiker who loves photography', 'NATE9012');

-- Add sample saved trails
INSERT INTO user_saved_trails (user_id, trail_id) VALUES
(1, 2), (1, 5), (2, 4), (3, 1);

-- Sample reviews with proper user_id and trail_id references
INSERT INTO reviews (user_id, trail_id, rating, written_review) VALUES
-- hiker_jane (user_id 1) reviewing Royal Arch Trail (trail_id 2)
(1, 2, 5, 'Absolutely loved the view from Royal Arch!'),

-- mountain_mike (user_id 2) reviewing Bear Peak (trail_id 4)
(2, 4, 4, 'Bear Peak kicked my butt but worth it'),

-- nature_nate (user_id 3) reviewing Boulder Creek Path (trail_id 5)
(3, 5, 5, 'Perfect easy walk along the creek'),

-- mountain_mike (user_id 2) reviewing Flagstaff Mountain Trail (trail_id 7)
(2, 7, 5, 'Flagstaff has the best sunset views!'),

-- nature_nate (user_id 3) reviewing South Boulder Peak Trail (trail_id 8)
(3, 8, 4, 'South Boulder Peak was tough but unforgettable');

-- Note: The created_at field will automatically be set to CURRENT_TIMESTAMP

-- Associate reviews with trails
INSERT INTO trails_to_reviews (trail_id, review_id) VALUES
(2, 1), (4, 2), (5, 3), (7, 4), (8, 5);

-- Insert sample images
INSERT INTO images (image_url, image_caption) VALUES
('https://example.com/royalarch1.jpg', 'View from Royal Arch'),
('https://example.com/bearpeak1.jpg', 'Summit of Bear Peak'),
('https://example.com/creekpath1.jpg', 'Boulder Creek in fall'),
('https://example.com/flagstaff1.jpg', 'Flagstaff Mountain sunset'),
('https://example.com/southboulder1.jpg', 'View from South Boulder Peak');

-- Associate images with reviews
INSERT INTO reviews_to_images (review_id, image_id) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5);

-- Sample hiking history
INSERT INTO history (start_location, end_location, buddy, date) VALUES
('Chautauqua Trailhead', 'Royal Arch', 'mountain_mike', '2023-05-15'),
('NCAR', 'Bear Peak', 'hiker_jane', '2023-06-20');

-- Sample friend relationships (will trigger mutual friendships)
INSERT INTO user_to_friend (username, friend_id) VALUES
(1, 2), (1, 3);

-- Sample friend requests
INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES
(2, 3, 'pending'),
(3, 2, 'accepted');
