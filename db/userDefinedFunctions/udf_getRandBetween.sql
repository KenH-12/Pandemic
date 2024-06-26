DELIMITER //

CREATE DEFINER=`root`@`localhost` FUNCTION `udf_getRandBetween`(
	`min` INT,
	`max` INT
)
RETURNS int(11)
BEGIN
	RETURN FLOOR(RAND()*(max-min+1))+min;
END //