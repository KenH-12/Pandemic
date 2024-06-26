DELIMITER //

CREATE DEFINER=`root`@`localhost` FUNCTION `udf_getEndCauseID`(
	`endCauseDescription` VARCHAR(9)
)
RETURNS tinyint(4)
BEGIN
	DECLARE id TINYINT;
	
	SELECT endCauseID INTO id
	FROM gameEndCause
	WHERE description = endCauseDescription;
	
	RETURN id;
END //