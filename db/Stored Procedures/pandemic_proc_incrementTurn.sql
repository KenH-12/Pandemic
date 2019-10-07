CREATE DEFINER=`root`@`localhost` PROCEDURE `increment_turn`(
	IN gID INT,
    OUT nextTurnID TINYINT
)
BEGIN
	-- get the nextTurnID from the player whose turn it is
    SELECT nextRoleID INTO nextTurnID
	FROM player
	WHERE gameID = gID
	AND roleID = 	(SELECT turnRoleID
					FROM game
					WHERE gameID = gID);
    
    -- update the turn
    UPDATE game
    SET turnRoleID = nextTurnID
	WHERE gameID = gID;
    
    -- 0 indicates failure
    IF ROW_COUNT() != 1 THEN
		SET nextTurnID = 0;
	END IF;
END