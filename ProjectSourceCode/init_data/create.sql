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