<?php
	try
	{
		session_start();
		require "../connect.php";
		include "../utilities.php";
		
		if (!isset($_SESSION["game"]))
			throw new Exception("Game not found");
		
		$game = $_SESSION["game"];
		$response = array();
		$EPIDEMIC_INTENSIFY_CODE = "et";
		
		$results = $mysqli->query("SELECT	id,
											turnNum,
											role,
											eventType AS 'code',
											details
									FROM vw_event
									WHERE game = $game
									ORDER BY id");
		
		while ($row = mysqli_fetch_assoc($results))
		{
			if ($row["code"] === $EPIDEMIC_INTENSIFY_CODE)
				$row["cardKeys"] = getEpidemicIntensifyCardKeys($mysqli, $row["id"]);

			$response[] = $row;
		}
	}
	catch(Exception $e)
	{
		$response["failure"] = $e->getMessage();
	}
	finally
	{
		$mysqli->close();

		echo json_encode($response);
	}
?>