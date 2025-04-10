---------- TEST SHARING WALK DATA ----------
/* Creating Test Cases - Had to create the (orignal, commented) tables in postgres if trying to replicate test */
INSERT INTO history (history_id, start_location, end_location, buddy, date)
    VALUES
    (1, '30th Street', 'Pearl Street', 'No Buddy', '2024-08-25'),
    (2, 'Laguna Pl', 'Williams Village', 'Helios', '2025-01-13'),
    (3, 'Inca Pkwy', 'Broadway', 'Minerva', '2025-02-28'),
    (4, 'Parker', 'Havana', 'Cerces', '2025-03-09');

INSERT INTO users (user_id, username, password) 
    VALUES
    (1, 'Helios', 'passwordtest'),
    (2, 'Minerva', 'passwordtest2'),
    (3, 'Cerces', 'passwordtest3');

INSERT INTO user_to_history (username, history_id)
    VALUES
    (1, 1), /* Helios recorded the first walk */
    (2, 2), /* Minerva recorded the second walk - with Helios */
    (3, 3), /* Cerces recorded the third walk - with Minerva */ 
    (2, 4); /* Minerva recorded the fourth walk - with Cerces */

/* INSERT THE SQL STRUCTURE SO THAT IT IS EITHER COPIED, OR SHARED TO THE BUDDY - BUT WITH THE BUDDY BEING THE OTHER USER*/
INSERT INTO user_to_history (username, history_id)
    SELECT 
        users.user_id, history.history_id
    FROM 
        history
    JOIN users 
        ON history.buddy = users.username
    WHERE 
        history.history_id IN (2, 3, 4);

/* QUERY TO CHECK IF THE HISTORY IS SHARED*/
SELECT
    user1.username AS walker,
    history.start_location,
    history.end_location,
    CASE
        WHEN 
            user2.username IS NOT NULL 
            THEN 
                user2.username
        ELSE 
            history.buddy
    END AS buddy,
    history.date
FROM 
    user_to_history user_to_history1
    JOIN users user1 
        ON user_to_history1.username = user1.user_id
    JOIN history 
        ON user_to_history1.history_id = history.history_id
    LEFT JOIN user_to_history user_to_history2
        ON user_to_history1.history_id = user_to_history2.history_id
        AND user_to_history2.username != user_to_history1.username 
    LEFT JOIN users user2 
        ON user_to_history2.username = user2.user_id
ORDER BY 
    history.date;
/*
 walker  | start_location |   end_location   |  buddy   |    date    
---------+----------------+------------------+----------+------------
 Helios  | 30th Street    | Pearl Street     | No Buddy | 2024-08-25
 Minerva | Laguna Pl      | Williams Village | Helios   | 2025-01-13
 Helios  | Laguna Pl      | Williams Village | Minerva  | 2025-01-13
 Minerva | Inca Pkwy      | Broadway         | Ceres    | 2025-02-28
 Ceres   | Inca Pkwy      | Broadway         | Minerva  | 2025-02-28
 Minerva | Parker         | Havana           | Ceres    | 2025-03-09
 Ceres   | Parker         | Havana           | Minerva  | 2025-03-09
(7 rows)
*/

/* QUERY TO CONDENSE BASED ON A SIGNLE USER*/
SELECT
    DISTINCT u_other.username AS walker,
    history.start_location,
    history.end_location,
    history.date
FROM 
    user_to_history uth_target
    JOIN users u_target 
        ON uth_target.username = u_target.user_id
    JOIN user_to_history uth_other
        ON uth_target.history_id = uth_other.history_id
        AND uth_other.username != uth_target.username
    JOIN users u_other 
        ON uth_other.username = u_other.user_id
    JOIN history
        ON uth_target.history_id = history.history_id
WHERE 
    u_target.username = 'Minerva' /* Hardcoded for testing purposes */
ORDER BY 
    history.date DESC
LIMIT 
    3;