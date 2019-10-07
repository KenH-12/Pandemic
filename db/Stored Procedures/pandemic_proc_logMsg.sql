CREATE DEFINER=`root`@`localhost` PROCEDURE `msg`(
	IN logMsg VARCHAR(100)
)
BEGIN
	INSERT INTO log (msg) VALUES (logMsg);
END