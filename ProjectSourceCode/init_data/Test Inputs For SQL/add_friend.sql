---------- TEST ADDING FRIEND ----------
/* Creating Test Cases - Had to create the (orignal, commented) tables in postgres if trying to replicate test */
INSERT INTO users (user_id, username, password) 
    VALUES
    (1, 'Helios', 'passwordtest'),
    (2, 'Minerva', 'passwordtest2'),
    (3, 'Cerces', 'passwordtest3');

INSERT INTO user_to_friend (username, friend_id)
    VALUES 
    (1, 2),
    (3, 1);


/* TESTING FOR A SPECIFIC USER */
SELECT 
    users.username AS friend_name
FROM 
    user_to_friend
    JOIN users
        ON user_to_friend.friend_id = users.user_id
WHERE 
    user_to_friend.username = 1; /* SEARCH BY USER ID, COULD ALSO TRY BY USER_NAME - TBD */

/* TESTING FOR MUTUAL FRIENDS */
SELECT 
    user1.username AS user, 
    user2.username AS friend
FROM
    user_to_friend
    JOIN users user1 
        ON user_to_friend.username = user1.user_id
    JOIN users user2 
        ON user_to_friend.friend_id = user2.user_id
ORDER BY 
    user1.username;