CREATE DEFINER=`root`@`localhost` PROCEDURE `setTurnOrder`(IN gID INT)
BEGIN
	DECLARE done BOOL DEFAULT FALSE;
	DECLARE role TINYINT;
    DECLARE firstRole TINYINT;
    DECLARE prevRole TINYINT;
    DECLARE highest_population_cursor CURSOR FOR
		-- Select the roleIDs (pileID) for this game
        -- ordered by the single highest population playerCard held by each role.
		SELECT pileID
		FROM vw_playercard
		WHERE game = gID
		AND pile != 'deck'
		AND pop =	(SELECT MAX(population)
					FROM city
					INNER JOIN location
					ON city.cityKey = location.cityKey
					WHERE playerCardPileID = pileID)
		ORDER BY pop DESC;
        
	DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    call msg('setting turn order...');
    OPEN highest_population_cursor;
    setNextTurnIDs: LOOP
    
		FETCH highest_population_cursor INTO role;
        IF done THEN
			LEAVE setNextTurnIDs;
        END IF;
        
        call msg(concat('role: ', role));
        IF ISNULL(firstRole) THEN
        -- The current role has the highest population playerCard and will therefore go first.
			UPDATE vw_gamestate
            SET turn = role
            WHERE game = gID;
            
			SET firstRole = role;
            SET prevRole = role;
		ELSE
        -- The prevRole will pass their turn to the current role.
        -- Set the nextID of the prevRole to the current role.
			UPDATE vw_player
            SET nextID = role
            WHERE game = gID
            AND rID = prevRole;
            
            SET prevRole = role;
		END IF;
	END LOOP setNextTurnIDs;
    CLOSE highest_population_cursor;
    
    -- Finally, the role that goes last will pass their turn to the role that went first.
    UPDATE vw_player
    SET nextID = firstRole
    WHERE game = gID
    AND rID = role;
END