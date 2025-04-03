DROP TABLE IF EXISTS trails CASCADE;
CREATE TABLE IF NOT EXISTS trails 
(
    average_rating DECIMAL,
    difficulty VARCHAR(100) CONSTRAINT limited_values CHECK (difficulty in ('easy', 'moderate', 'difficult', 'very_difficult')),
    discription VARCHAR(200) NOT NULL,
    distance DECIMAL,
    location VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    trail_id SERIAL PRIMARY KEY NOT NULL
);

DROP TABLE IF EXISTS reviews CASCADE;
CREATE TABLE IF NOT EXISTS reviews 
(
  review_id SERIAL PRIMARY KEY NOT NULL,
  username VARCHAR(100),
  review VARCHAR(200),
  rating DECIMAL NOT NULL
);

DROP TABLE IF EXISTS images CASCADE;
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
    about VARCHAR(200) NOT NULL
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
    user_id INT NOT NULL
);

DROP TABLE IF EXISTS user_to_friend CASCADE;
CREATE TABLE user_to_friend
(
    user_id INT NOT NULL,
    friend_id INT NOT NULL
);

DROP TABLE IF EXISTS trails_to_user CASCADE;
CREATE TABLE user_to_achievements
(
    user_id INT NOT NULL,
    achievements_id INT NOT NULL
);

DROP TABLE IF EXISTS user_to_history CASCADE;
CREATE TABLE user_to_history
(
    user_id INT NOT NULL,
    history_id INT NOT NULL
);