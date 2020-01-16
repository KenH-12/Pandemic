<?php
	session_start();
	
	if (isset($_SESSION["game"]))
	{
		$game = $_SESSION["game"];
		$response = array();
		$EPIDEMIC_INTENSIFY_CODE = "et";
		
		require "../connect.php";
		include "../utilities.php";
		
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
		
		$mysqli->close();
	}
	
	echo json_encode($response);
?>