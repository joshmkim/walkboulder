---------- TEST DISPLAYING THE THREE MOST RECENT WALKS ----------
/* Creating Test Cases - Had to create the (orignal, commented) tables in postgres if trying to replicate test */
INSERT INTO history (history_id, start_location, end_location, buddy, date)
    VALUES
    (1, '30th Street', 'Pearl Street', 'No Buddy', '2024-08-25'),
    (2, 'Laguna Pl', 'Williams Village', 'Helios', '2025-01-13'),
    (3, 'Inca Pkwy', 'Broadway', 'Minerva', '2025-02-28'),
    (4, 'Parker', 'Havana', 'Ceres', '2025-03-09');

INSERT INTO users (user_id, username, password) 
    VALUES
    (1, 'person1', 'passwordtest'),
    (2, 'person2', 'passwordtest2');

INSERT INTO user_to_history (username,  history_id)
    VALUES
    (1,1),
    (1,2),
    (1,3),
    (1,4);

/* TESTING TO SHOW THE THREE MOST RECENT WALKS OF A USER */
SELECT
    history.date,
    history.buddy
FROM
    history
    INNER JOIN user_to_history
        ON history.history_id = user_to_history.history_id
    INNER JOIN users
        ON users.user_id = user_to_history.username
ORDER BY
    history.date DESC
LIMIT
    3;

/*
    date    |  buddy  
------------+---------
 2025-03-09 | Ceres
 2025-02-28 | Minerva
 2025-01-13 | Helios
(3 rows)
*/