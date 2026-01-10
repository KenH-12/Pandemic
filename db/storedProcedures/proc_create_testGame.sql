DELIMITER //

CREATE PROCEDURE `proc_create_testGame`(
	IN `numPlayers` TINYINT,
	IN `numEpidemics` TINYINT
)
BEGIN
	DECLARE gID INT;
	DECLARE playerCounter TINYINT DEFAULT 0;
	
	IF numPlayers >= 2 AND numPlayers <= 4
		AND numEpidemics >= 4 AND numEpidemics <= 6
	THEN
		DELETE FROM epidemicIntensify;
		DELETE FROM eventHistory;
		DELETE FROM player;
		DELETE FROM location;
		DELETE FROM pandemic;
		DELETE FROM game;
		
		INSERT INTO game (epidemicCards) VALUES (numEpidemics);
		SET gID = LAST_INSERT_ID();
		
		INSERT INTO pandemic (gameID) VALUES (gID);
		
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
	
	END IF;
END //