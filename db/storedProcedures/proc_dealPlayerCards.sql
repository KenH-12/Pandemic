DELIMITER //

CREATE PROCEDURE `proc_dealPlayerCards`(IN `gID` INT)
BEGIN
    DECLARE startingHandSize TINYINT;
    DECLARE handID TINYINT;
    DECLARE handIdx TINYINT;
    
    DECLARE cKey CHAR(4);
    DECLARE done INT DEFAULT FALSE;
    DECLARE card_cursor CURSOR FOR	SELECT cityKey
									FROM city
                                    WHERE diseaseColor != 'x'
                                    ORDER BY RAND();
	DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
	
	-- Simple formula determines the starting hand size
	SET startingHandSize = 6 - (SELECT COUNT(*)
                                FROM vw_player
                                WHERE game = gID);
    
	OPEN card_cursor;
		arrange_cards: LOOP
			
			FETCH card_cursor INTO cKey;
			IF done THEN
				LEAVE arrange_cards;
			END IF;

            -- Get the pileID of a player who still needs cards, which is also their roleID
            SELECT rID INTO handID
            FROM vw_player
            WHERE game = gID
            AND rID NOT IN (SELECT pileID
                            FROM vw_playerCard
                            WHERE game = gID
                            AND pile != 'deck'
                            GROUP BY pileID
                            HAVING COUNT(*) = startingHandSize)
            LIMIT 1;
            
            IF handID IS NULL THEN
                LEAVE arrange_cards;
            END IF;
            
            -- Get the next index within the player's hand.
            SET handIdx = (SELECT COUNT(*)
                            FROM vw_playerCard
                            WHERE game = gID
                            AND pileID = handID) + 1;

            -- Put the card in the player's hand.
            UPDATE vw_playerCard
            SET pileID = handID,
                cardIndex = handIdx
            WHERE game = gID
            AND cardKey = cKey;

		END LOOP arrange_cards;
	CLOSE card_cursor;

    CALL proc_insert_startingHandEvents(gID);
    
    -- Turn order is determined by the highest population
    -- playerCard held by each role.
    CALL proc_update_turnOrder(gID);

END //
DELIMITER ;