---------- TEST LINKING THE SAME TABLE ----------
/* Creating Test Cases - Had to create the tables in postgres if trying to replicate test */
INSERT INTO users (user_id, username, password) 
    VALUES
    (1, 'person1', 'passwordtest'),
    (2, 'person2', 'passwordtest2');

INSERT INTO user_to_friend (username, friend_id)
    VALUES
    (1,2),
    (2,1);

/* TESTING TO DISPLAY FRIEND LIST */
SELECT
    users.username
FROM 
    users
WHERE
    users.user_id = ALL (SELECT friend_id FROM user_to_friend WHERE user_id = 1 /*Hardcoded for testing purposes*/);

/*
 username 
----------
 person2
(1 row)
*/