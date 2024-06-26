DELIMITER //

CREATE FUNCTION `udf_getInfectionRate`(
	`epidemicCount` TINYINT
)
RETURNS TINYINT
BEGIN
	IF epidemicCount <= 2 THEN
		RETURN 2;
	ELSEIF epidemicCount <= 4 THEN
		RETURN 3;
	ELSE
		RETURN 4;
	END IF;
END //