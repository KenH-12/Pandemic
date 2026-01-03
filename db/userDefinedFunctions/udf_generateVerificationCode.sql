DELIMITER //

CREATE DEFINER=`root`@`localhost` FUNCTION `udf_generateVerificationCode`(
	`uID` INT
)
RETURNS int(11)
BEGIN
	DECLARE newCode INT DEFAULT 0;
	
	SET newCode = udf_getRandBetween(10000, 99999);
	
	INSERT INTO verificationCode
		(vCode, expiry, userID)
	VALUES
		(newCode, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR), uID);
	
	IF ROW_COUNT() != 1 THEN
		SET newCode = 0;
	END IF;
	
	RETURN newCode;
END //