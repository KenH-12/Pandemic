<?php
	session_start();
	
	if (isset($_SESSION["game"]))
	{
		$game = $_SESSION["game"];
		
		require "../connect.php";
		
		$results = $mysqli->query("SELECT	id,
											turnNum,
											role,
											eventType AS 'code',
											details
									FROM vw_event
									WHERE game = $game
									ORDER BY id");
		
		$response = array();
		while ($row = mysqli_fetch_assoc($results))
		{
			$response[] = $row;
		}
		
		$mysqli->close();
	}
	
	echo json_encode($response);
?>