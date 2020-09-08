CREATE DEFINER=`root`@`localhost` FUNCTION `udf_generateVerificationCode`(
	`uID` INT
)
RETURNS int(11)
LANGUAGE SQL
NOT DETERMINISTIC
CONTAINS SQL
SQL SECURITY DEFINER
COMMENT ''
BEGIN
	DECLARE newCode INT DEFAULT 0;
	
	SET newCode = udf_getRandBetween(10000, 99999);
	
	INSERT INTO verificationCode
		(vCode, expiry, userID)
	VALUES
		(newCode, DATE_ADD(NOW(), INTERVAL 1 HOUR), uID);
	
	IF ROW_COUNT() != 1 THEN
		SET newCode = 0;
	END IF;
	
	RETURN newCode;
END