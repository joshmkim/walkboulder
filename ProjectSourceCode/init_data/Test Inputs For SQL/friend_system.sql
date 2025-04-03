/* ASK TA HOW TO SET UP THE users TABLE SO THAT I CAN SET UP FRIENDS */
---------- TEST LINKING THE SAME TABLE ----------
/* Creating Test Cases - Had to create the tables in postgres if trying to replicate test */
INSERT INTO users (user_id, username, password, total_distance, about) 
    VALUES
    (1, 'person1', 'passwordtest', 9, 'hello'),
    (2, 'person2', 'passwordtest2', 0, 'good day');

INSERT INTO user_to_friend (user_id, friend_id)
    VALUES
    (1,2),
    (2,1);

/* SQL INPUT */
    /* Not functional - just setting up format */
SELECT
    account_user.username AS user
    friend_user.username AS friend
FROM 
    users account_user
LEFT JOIN
    users friend_user ON account_user.user_id 

/*

*/