<?php
	session_start();
	
	if (isset($_SESSION["game"]))
	{
		if (isset($_POST["lastEventID"]))
		{
			$game = $_SESSION["game"];
			$lastEventID = $_POST["lastEventID"];
			
			require "../connect.php";
			
			$results = $mysqli->query("SELECT	id,
												turnNum,
												role,
												eventType AS 'code',
												details
										FROM vw_event
										WHERE game = $game
										AND id > $lastEventID
										ORDER BY id");
			
			$response = array();
			while ($row = mysqli_fetch_assoc($results))
			{
				$response[] = $row;
			}
			
			$mysqli->close();
		}
		else
			$response = "lastEventID not set";
	}
	else
		$response = "game not found";
	
	echo json_encode($response);
?>