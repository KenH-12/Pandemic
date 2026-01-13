DELIMITER //

CREATE PROCEDURE `proc_preparePlayerDeck`(
    IN `p_gID` INT,
    IN `p_epidemicIndices` VARCHAR(20)
)
BEGIN
    DECLARE v_cardIndex TINYINT DEFAULT 1;
    DECLARE v_cardKey CHAR(4);
    DECLARE v_epidemicCount TINYINT DEFAULT 0;
    
    DECLARE done INT DEFAULT FALSE;
    DECLARE cardCursor CURSOR FOR   SELECT cardKey
                                    FROM vw_playerCard
                                    WHERE game = p_gID
                                    AND pileID = udf_getPileID('deck')
                                    AND cardIndex IS NULL
                                    ORDER BY RAND();
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cardCursor;
    preparePlayerDeck: LOOP
        IF FIND_IN_SET(v_cardIndex, p_epidemicIndices) = 0 THEN
            -- Get the next card from the deck
            FETCH cardCursor INTO v_cardKey;
            IF done THEN
                LEAVE preparePlayerDeck;
            END IF;
            
            -- Set playerCardIndex
            UPDATE vw_playerCard
            SET cardIndex = v_cardIndex
            WHERE game = p_gID
            AND cardKey = v_cardKey;
        ELSE
            -- Insert an epidemic at v_cardIndex and continue
            INSERT INTO vw_playerCard (game, cardKey, cardIndex)
            VALUES (p_gID, CONCAT('epi', v_epidemicCount + 1), v_cardIndex);
            
            SET v_epidemicCount = v_epidemicCount + 1;
        END IF;

        SET v_cardIndex = v_cardIndex + 1;
    END LOOP preparePlayerDeck;
    CLOSE cardCursor;
END //
DELIMITER ;