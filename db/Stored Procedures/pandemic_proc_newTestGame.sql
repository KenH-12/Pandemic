CREATE DEFINER=`root`@`localhost` PROCEDURE `new_testGame`(
	IN numPlayers TINYINT,
    IN numEpidemics TINYINT
)
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
		DELETE FROM log;
		
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
            CALL assign_role(gID, playerCounter);
		END WHILE;
        
	END IF;
END