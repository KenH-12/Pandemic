CREATE DEFINER=`root`@`localhost` PROCEDURE `recordStartingHands`(
	IN gID INT
)
BEGIN
	DECLARE rID TINYINT;
    DECLARE done BOOL DEFAULT FALSE;
    DECLARE role_cursor CURSOR FOR	SELECT roleID
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
        SELECT pileID, GROUP_CONCAT(cardKey ORDER BY cardIndex)
        INTO @pileID, @cardKeys
        FROM vw_playercard
        WHERE game = gID
        AND pileID = rID
        GROUP BY pileID;
        -- Insert the Starting Hand event
        INSERT INTO vw_event (game, turnNum, role, eventType, details)
		VALUES (gID, 0, rID, 'sh', @cardKeys);
        
    END LOOP role_loop;
    CLOSE role_cursor;
END