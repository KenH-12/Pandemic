CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_create_testGame`(
	IN `numPlayers` TINYINT,
	IN `numEpidemics` TINYINT
)
LANGUAGE SQL
NOT DETERMINISTIC
CONTAINS SQL
SQL SECURITY DEFINER
COMMENT ''
BEGIN
	DECLARE gID INT;
	DECLARE playerCounter TINYINT DEFAULT 0;
	
	IF numPlayers >= 2 AND numPlayers <= 4
		AND numEpidemics >= 4 AND numEpidemics <= 6
	THEN
		DELETE FROM eventhistory;
		DELETE FROM player;
		DELETE FROM location;
		DELETE FROM game;
		
		INSERT INTO game (epidemicCards) VALUES (numEpidemics);
		SET gID = LAST_INSERT_ID();
		
		WHILE playerCounter < numPlayers
		DO
			SET playerCounter = playerCounter + 1;
			INSERT INTO player (gameID, userID) VALUES (gID, playerCounter);
		END WHILE;
			
		SET playerCounter = 0;
		WHILE playerCounter < numPlayers
		DO
			SET playerCounter = playerCounter + 1;
			CALL proc_assignRole(gID, playerCounter);
		END WHILE;
		
	CALL proc_insert_locations(gID);
	CALL proc_arrangePlayerCards(gID);
	CALL proc_infectNineCities(gID);
	CALL proc_update_turnOrder(gID);
	
	-- Ready to begin turn 1
	UPDATE game
	SET turnNumber = 1
	WHERE gameID = gID;
	
	END IF;
END