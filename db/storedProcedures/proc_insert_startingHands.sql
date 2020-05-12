CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_insert_startingHands`(
	IN `gID` INT
)
LANGUAGE SQL
NOT DETERMINISTIC
CONTAINS SQL
SQL SECURITY DEFINER
COMMENT ''
BEGIN
	DECLARE rID TINYINT;
	DECLARE done BOOL DEFAULT FALSE;
	DECLARE role_cursor CURSOR FOR
		SELECT roleID
		FROM player
		WHERE gameID = gID;
	DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
	
	OPEN role_cursor;
		role_loop: LOOP
			
			FETCH role_cursor INTO rID;
			IF done THEN
				LEAVE role_loop;
			END IF;
			
			-- Get a concatenated string of the cardKeys in the player's starting hand ('sh')
			SELECT pileID, GROUP_CONCAT(cardKey)
			INTO @pileID, @cardKeys
			FROM vw_playercard
			WHERE game = gID
			AND pileID = rID
			GROUP BY pileID;
			-- Insert the Starting Hand event
			INSERT INTO vw_event (game, role, eventType, details)
			VALUES (gID, rID, 'sh', @cardKeys);
			
		END LOOP role_loop;
	CLOSE role_cursor;
END