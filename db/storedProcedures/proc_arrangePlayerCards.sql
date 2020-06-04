CREATE DEFINER=`root`@`localhost` PROCEDURE `proc_arrangePlayerCards`(
	IN `gID` INT
)
LANGUAGE SQL
NOT DETERMINISTIC
CONTAINS SQL
SQL SECURITY DEFINER
COMMENT ''
BEGIN
    DECLARE startingHandSize TINYINT;
    DECLARE playersNeedCards BOOL DEFAULT TRUE;
    DECLARE handID TINYINT;
    DECLARE handIdx TINYINT;
    
    DECLARE cardsLeftInDeck TINYINT;
    DECLARE deckID TINYINT DEFAULT udf_getPileID('deck');
    
    DECLARE divisionSize TINYINT;
    DECLARE divRemainder TINYINT;
    DECLARE divStartIdx TINYINT DEFAULT 1;
    DECLARE divEndIdx TINYINT;
    DECLARE idx TINYINT DEFAULT 1;
    DECLARE nextEpidemicIdx TINYINT;
    DECLARE epidemicsToInsert TINYINT;
    DECLARE epidemicCount TINYINT DEFAULT 0;
    
    DECLARE cKey CHAR(4);
    -- DECLARE lastCityKey CHAR(4);
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
	
	SET epidemicsToInsert = (SELECT epidemicCards FROM game WHERE gameID = gID);
	
	-- We need to know how many cards are in the deck when it's time to insert the epidemics.
	-- Player cards are derived from CITY (event cards included).
	SET cardsLeftInDeck = (SELECT COUNT(*)
									FROM city
									WHERE diseaseColor != 'x') + epidemicsToInsert;
    
	OPEN card_cursor;
		arrange_cards: LOOP
			
			WHILE idx = nextEpidemicIdx -- using while loop in case of consecutive epidemics
			DO
				-- Insert an epidemic
				SET epidemicCount = epidemicCount + 1;
				INSERT INTO vw_playerCard
					(game, cardKey, cardIndex)
				VALUES
					(gID, CONCAT('epi', epidemicCount), idx);
				
				SET idx = idx + 1;
				
				IF epidemicCount < epidemicsToInsert THEN -- Determine the nextEpidemicIdx...
					-- Get the next division boundaries
					SET divStartIdx = divEndIdx + 1;
					SET divEndIdx = divEndIdx + divisionSize;
					
					-- If remainders exist, account for one
					IF divRemainder > 0 THEN
						SET divEndIdx = divEndIdx + 1;
						SET divRemainder = divRemainder - 1;
					END IF;
					-- Randomly set the epidemic index somewhere within the next division
					SET nextEpidemicIdx = udf_getRandBetween(divStartIdx, divEndIdx);
				END IF;
			END WHILE;
			
			SET done = FALSE;
			FETCH card_cursor INTO cKey;
			
			IF done THEN
				LEAVE arrange_cards;
			END IF;
			
			-- Insert any event cards -- they were not handled during insert_locations
			IF cKey IN ('resi', 'oneq', 'fore', 'airl', 'gove') THEN
				INSERT INTO vw_playerCard
					(game, cardKey)
				VALUES
					(gID, cKey);
			END IF;
			
			IF playersNeedCards THEN
				-- Get the pileID of a player who still needs cards, which is also their roleID
				SET handID = (SELECT rID
									FROM vw_player
									LEFT OUTER JOIN vw_playerCard
									ON vw_player.rID = vw_playerCard.pileID
									WHERE vw_player.game = gID
									GROUP BY rID
									HAVING COUNT(*) < startingHandSize
									LIMIT 1);
				
				IF handID IS NOT NULL THEN
					-- Get the next index within the player's hand.
					SET handIdx = (SELECT COUNT(*)
					FROM vw_playerCard
					WHERE game = gID
					AND pileID = handID) + 1;
					-- Put the card in the player's hand.
					UPDATE vw_playercard
					SET pileID = handID,
						cardIndex = handIdx
					WHERE game = gID
					AND cardKey = cKey;
					
					SET cardsLeftInDeck = cardsLeftInDeck - 1;
				ELSE
					-- Proceed to Player Deck arrangement (see step 5 of SETUP in the official rules)
					SET playersNeedCards = FALSE;
					
					SET divisionSize = FLOOR(cardsLeftInDeck / epidemicsToInsert);
					SET divRemainder = MOD(cardsLeftInDeck, epidemicsToInsert);
					SET divEndIdx = divisionSize;
					
					-- If remainders exist, account for one.
					IF divRemainder > 0 THEN
						SET divEndIdx = divEndIdx + 1;
						SET divRemainder = divRemainder - 1;
					END IF;
					
					-- Randomly determine the index of the first epidemic card.
					SET nextEpidemicIdx = udf_getRandBetween(divStartIdx, divEndIdx);
				END IF;
			END IF;
			
			IF playersNeedCards = FALSE THEN
				-- Set the card index
				UPDATE vw_playerCard
				SET cardIndex = idx
				WHERE game = gID
				AND cardKey = cKey;
				
				SET idx = idx + 1;
			END IF;
			
		END LOOP arrange_cards;
	CLOSE card_cursor;
	
	CALL proc_insert_startingHands(gID);
	CALL proc_update_turnOrder(gID);
END