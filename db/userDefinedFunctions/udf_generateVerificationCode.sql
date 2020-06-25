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
	DECLARE vCode INT DEFAULT 0;
	
	WHILE vCode = 0
	DO
		SET vCode = udf_getRandBetween(10000, 99999);
		
		IF vCode IN (SELECT vCode FROM verificationCode) THEN
			SET vCode = 0;
		END IF;
	END WHILE;
	
	INSERT INTO verificationCode
		(vCode, expiry, userID)
	VALUES
		(vCode, DATE_ADD(NOW(), INTERVAL 1 HOUR), uID);
	
	IF ROW_COUNT() != 1 THEN
		SET vCode = 0;
	END IF;
	
	RETURN vCode;
END