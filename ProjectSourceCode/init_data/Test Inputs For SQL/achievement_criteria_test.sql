---------- TEST ACHIEVEMENT CRITERIA ----------
/* Creating Test Cases - Had to create the (orignal, commented) tables in postgres if trying to replicate test */
INSERT INTO history (history_id, start_location, end_location, buddy, date)
    VALUES
    (1, '30th Street', 'Pearl Street', 'No Buddy', '2024-08-25'),
    (2, 'Laguna Pl', 'Williams Village', 'Helios', '2025-01-13'),
    (3, 'Inca Pkwy', 'Broadway', 'Minerva', '2025-02-28'),
    (4, 'Parker', 'Havana', 'Ceres', '2025-03-09');

INSERT INTO users (user_id, username, password) 
    VALUES
    (1, 'Diana', 'passwordtest'),
    (2, 'Helios', 'passwordtest2'),
    (3, 'Minerva', 'passwordtest3'),
    (4, 'Cerces', 'passwordtest4');

INSERT INTO user_to_history (username,  history_id)
    VALUES
    (1,1),
    (1,2),
    (1,3),
    (1,4);

/* IF A USER HAS WALKED WITH THREE DISTINCT FRIENDS */
SELECT 
    COUNT(DISTINCT history.buddy) AS unique_buddies
FROM 
    user_to_history
    JOIN history 
        ON user_to_history.history_id = history.history_id
WHERE 
    user_to_history.username = 1
    AND history.buddy IS NOT NULL
    AND history.buddy != 'No Buddy'
    AND LOWER(history.buddy) != 'no buddy'; -- accounting for case sensitive no buddy



/* either add a trigger (in create.sql) or a back-end code (in index.js) to make the achievement critria easier*/