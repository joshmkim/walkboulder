/* ACHIEVEMENTS */
INSERT INTO achievements (achievements_id, achievements_url, achievements_caption)
    VALUES
    (1, '', 'Record your first walk'),
    (2, '', 'Add your first friend'),
    (3, '', 'Leave your first review'); /*,
    (4, '', 'Use WalkBoulder for 1 week'),
    (5, '', 'Walk a total of X miles / Y meters'),
    (6, '', 'Have Z friends'),
    (7, '', 'First walk with a buddy'),
    (8, '', 'Use WalkBoulder for 1 month'),
    (9, '', 'Walk on a pre-set trail'),
    (10, '', 'Create your own route'),
    (11, '', 'Walk with three distict buddies');*/

/* SQL TO SEE IF USER EARNS THE ACHIEVEMENTS */
    /* ACHIEVEMENT 1: FIRST WALK */
    SELECT 
        COUNT(*) 
    FROM 
        user_to_history
    WHERE 
        username = $1;

    /* ACHIEVMEMENT 2: FIRST FRIEND */
    SELECT 
        COUNT(*) 
    FROM 
        user_to_friend
    WHERE 
        username = $1;

    /* ACHIEVEMENT 3: FIRST REVIEW */
    SELECT 
        COUNT(*) 
    FROM 
        reviews
    WHERE 
        user_id = $1;