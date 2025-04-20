-- Drop all tables first to avoid conflicts
DROP TABLE IF EXISTS user_to_history CASCADE;
DROP TABLE IF EXISTS user_to_achievements CASCADE;
DROP TABLE IF EXISTS user_to_friend CASCADE;
DROP TABLE IF EXISTS trails_to_user CASCADE;
DROP TABLE IF EXISTS trails_to_reviews CASCADE;
DROP TABLE IF EXISTS history CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS trails CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;

-- Create tables (order matters for foreign keys)
CREATE TABLE trails 
(
    average_rating DECIMAL,
    distance DECIMAL,
    start_location VARCHAR(100) NOT NULL,
    end_location VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    trail_id SERIAL PRIMARY KEY
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    password VARCHAR(100) NOT NULL,
    total_distance INT, -- or DECIMAL
    about VARCHAR(200),
    avatar BYTEA
);

CREATE TABLE achievements (
    achievements_id SERIAL PRIMARY KEY,
    achievements_url VARCHAR(300) NOT NULL,
    achievements_caption VARCHAR(200)
);

CREATE TABLE history (
    history_id SERIAL PRIMARY KEY,
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

CREATE TABLE trails_to_reviews 
(
  trail_id INT NOT NULL,
  review_id INT NOT NULL,
  FOREIGN KEY (trail_id) REFERENCES trails (trail_id) ON DELETE CASCADE,
  FOREIGN KEY (review_id) REFERENCES reviews (review_id) ON DELETE CASCADE
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

-- Struggling to work
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

-- Fixed achievements:
INSERT INTO achievements (achievements_id, achievements_url, achievements_caption)
    VALUES
    (1, '', 'Record your first walk'),
    (2, '', 'Add your first friend'),
    (3, '', 'Leave your first review');

-- Preset Database Values:
INSERT INTO users (user_id, username, password) 
    VALUES
    (1, 'Diana', 'passwordtest'),
    (2, 'Helios', 'passwordtest2'),
    (3, 'Minerva', 'passwordtest3'),
    (4, 'Cerces', 'passwordtest4');

INSERT INTO history (history_id, start_location, end_location, buddy, date)
    VALUES
    (1, '30th Street', 'Pearl Street', 'No Buddy', '2024-08-25'),
    (2, 'Laguna Pl', 'Williams Village', 'Helios', '2025-01-13'),
    (3, 'Inca Pkwy', 'Broadway', 'Minerva', '2025-02-28'),
    (4, 'Parker', 'Havana', 'Ceres', '2025-03-09');

INSERT INTO user_to_history (username,  history_id)
    VALUES
    (1, 1),
    (3, 2),
    (4, 3),
    (1, 4);

INSERT INTO user_to_friend (username, friend_id) -- only need to insert values one way, the trigger will make it two-way
    VALUES
    (3, 2),
    (1, 4),
    (3, 4); 

INSERT INTO user_to_achievements (username, achievements_id)
    VALUES
    (1, 1),
    (1, 2),
    (2, 1),
    (2, 2),
    (3, 1),
    (3, 2),
    (4, 1),
    (4, 2);