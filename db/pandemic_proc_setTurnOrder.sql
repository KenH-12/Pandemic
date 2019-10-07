CREATE DEFINER=`root`@`localhost` PROCEDURE `set_turnOrder`(
	IN gID INT
)
BEGIN
-- This procedure sets the order of turns for a game by setting each player's nextRoleID (to whom they will pass their turns).
	DECLARE rID INT; -- roleID of the row to update
    DECLARE nextID INT; -- roleID to which to the turn will be passed
    DECLARE rowsToUpdate TINYINT; -- loop variable
    
    -- Get the number of roles that will take part in the game
    SELECT COUNT(*) INTO rowsToUpdate
	FROM player
	WHERE gameID = gID;
    
    WHILE rowsToUpdate > 0
	DO
		-- Start with the first result...
        IF ISNULL(nextID) THEN
			SELECT roleID INTO rID
			FROM player
			WHERE gameID = gID
			AND nextRoleID = 0
			LIMIT 1;
		ELSE -- ...and proceed in the order that's decided by this loop.
			SET rID = nextID;
		END IF;
        -- Select a roleID to be this role's nextRoleID.
        IF rowsToUpdate > 1 THEN
        -- Select a random roleID.
        -- Exclude the current rID and any roleID that has already had its nextRoleID assigned.
        SELECT roleID INTO nextID
			FROM player
			WHERE gameID = gID
			AND roleID != rID
            AND roleID NOT IN (	SELECT roleID
								FROM player
                                WHERE gameID = gID
                                AND nextRoleID != 0)
			ORDER BY RAND() LIMIT 1;
		ELSE -- This is the last assignment, so the nextRoleID will be the roleID which had its nextRoleID assigned first.
			SELECT roleID INTO nextID
            FROM player
            WHERE gameID = gID
            LIMIT 1;
		END IF;
        -- Update the nextRoleID.
        UPDATE player
        SET nextRoleID = nextID
        WHERE gameID = gID
        AND roleID = rID;
        
        SET rowsToUpdate = rowsToUpdate - 1;
    END WHILE;
END