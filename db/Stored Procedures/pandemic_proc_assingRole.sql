CREATE DEFINER=`root`@`localhost` PROCEDURE `assign_role`(
	IN p_gameID INT,
    IN p_userID INT
)
BEGIN
-- This procedure randomly assigns a role to a single player for a single game.
-- Note: A single user can assume and control more than one player role for a single game.
	DECLARE v_roleID TINYINT;
    SET v_roleID = (SELECT roleID
					FROM role
					WHERE roleID NOT IN (SELECT roleID
										FROM player
										WHERE gameID = p_gameID)
					ORDER BY RAND() LIMIT 1);
    
	UPDATE player
    SET roleID = v_roleID
	WHERE gameID = p_gameID
    AND userID = p_userID;
    
    IF (SELECT COUNT(*)
		FROM player
        WHERE gameID = p_gameID
        AND roleID = 0) = 0
	THEN
		CALL setup_game(p_gameID);
    END IF;
END