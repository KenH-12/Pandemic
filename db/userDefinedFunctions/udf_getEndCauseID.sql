CREATE DEFINER=`root`@`localhost` FUNCTION `udf_getEndCauseID`(
	`endCauseDescription` VARCHAR(9)
)
RETURNS tinyint(4)
LANGUAGE SQL
NOT DETERMINISTIC
CONTAINS SQL
SQL SECURITY DEFINER
COMMENT ''
BEGIN
	DECLARE id TINYINT;
	
	SELECT endCauseID INTO id
	FROM gameEndCause
	WHERE description = endCauseDescription;
	
	RETURN id;
END