DELIMITER //

CREATE DEFINER=`root`@`localhost` FUNCTION `udf_getPileID`(
	`p_pileName` VARCHAR(21)
)
RETURNS tinyint(4)
BEGIN
	DECLARE pileID TINYINT;
	
	SELECT ID INTO pileID
	FROM cardPile
	WHERE pileName = p_pileName;
	
	RETURN pileID;
END //