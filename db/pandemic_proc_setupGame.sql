CREATE DEFINER=`root`@`localhost` PROCEDURE `setup_game`(
	IN gID INT
)
BEGIN
	CALL set_turnOrder(gID);
    CALL insert_locations(gID);
    -- CALL shuffle_playerCards(gID);
    -- CALL deal_playerCards(gID);
    CALL arrange_playerCards(gID);
    CALL infect_nine_cities(gID);
END